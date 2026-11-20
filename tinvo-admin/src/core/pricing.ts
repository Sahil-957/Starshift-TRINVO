/**
 * Order totals and GST (proposal §3.7). Pure: no I/O, unit-tested in pricing.test.ts.
 * Prices are tax-inclusive, so tax is carved out of each line, never added on:
 *   taxable = round(gross × 10000 / (10000 + rate_bps)),  tax = gross − taxable
 * Shipping is taxed at the goods' rate (the highest rate in the order).
 * A multi-buy saving comes off the goods before tax, spread over the lines by value.
 */
export type PriceLine = { unitPriceMinor: number; quantity: number; taxRateBps: number };
export type TaxLine = { kind: "cgst" | "sgst" | "igst"; rateBps: number; taxableMinor: number; amountMinor: number };

/** "Buy more, save more": the best tier the order's total quantity reaches, until `endsAt` (ISO). */
export type MultiBuy = { tiers: { minQty: number; offMinor: number }[]; endsAt: string };

/** The saving `offer` gives an order of `quantity` items at `now`. */
export function multiBuyDiscount(offer: MultiBuy | null | undefined, quantity: number, now: Date): number {
  if (!offer || now.getTime() >= Date.parse(offer.endsAt)) return 0;
  return Math.max(0, ...offer.tiers.filter((t) => quantity >= t.minQty).map((t) => t.offMinor));
}

/** `amount` split over `weights` in proportion, in whole paise, summing exactly to `amount`. */
export function apportion(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (!total) return weights.map(() => 0);
  const shares = weights.map((w) => Math.floor((amount * w) / total));
  const order = weights.map((_, i) => i).sort((a, b) => weights[b] - weights[a]);
  for (let rest = amount - shares.reduce((s, x) => s + x, 0), k = 0; rest > 0; rest--, k++) shares[order[k % order.length]]++;
  return shares;
}

export type PricingInput = {
  lines: PriceLine[];
  shippingFlatMinor: number;
  /** null: shipping always charged */
  freeShippingOverMinor: number | null;
  /** tax lines are only computed for a registered shop */
  gstin: string | null;
  originState: string | null;
  destinationState: string;
  multiBuy?: MultiBuy | null;
  /** when the order is placed; decides whether the offer is still on */
  now?: Date;
};

export function priceOrder(input: PricingInput) {
  const gross = input.lines.map((l) => l.unitPriceMinor * l.quantity);
  const subtotalMinor = gross.reduce((s, g) => s + g, 0);
  const quantity = input.lines.reduce((s, l) => s + l.quantity, 0);
  const discountMinor = Math.min(subtotalMinor, multiBuyDiscount(input.multiBuy, quantity, input.now ?? new Date()));
  const goodsMinor = subtotalMinor - discountMinor;
  const free = input.freeShippingOverMinor !== null && goodsMinor >= input.freeShippingOverMinor;
  const shippingMinor = free ? 0 : input.shippingFlatMinor;
  const totalMinor = goodsMinor + shippingMinor;

  if (!input.gstin || !input.originState) {
    return { subtotalMinor, discountMinor, shippingMinor, totalMinor, taxMinor: 0, taxTreatment: null, taxLines: [] as TaxLine[] };
  }

  // group gross amounts (after the saving) by rate; shipping joins the highest goods rate
  const off = apportion(discountMinor, gross);
  const byRate = new Map<number, number>();
  input.lines.forEach((l, i) => byRate.set(l.taxRateBps, (byRate.get(l.taxRateBps) ?? 0) + gross[i] - off[i]));
  if (shippingMinor > 0) {
    const top = Math.max(...input.lines.map((l) => l.taxRateBps));
    byRate.set(top, (byRate.get(top) ?? 0) + shippingMinor);
  }

  const intra = input.destinationState === input.originState;
  const taxLines: TaxLine[] = [];
  for (const [rateBps, gross] of byRate) {
    if (rateBps === 0) continue;
    const taxable = Math.round((gross * 10000) / (10000 + rateBps));
    const tax = gross - taxable;
    if (intra) {
      const half = Math.floor(tax / 2);
      taxLines.push({ kind: "cgst", rateBps: rateBps / 2, taxableMinor: taxable, amountMinor: half });
      taxLines.push({ kind: "sgst", rateBps: rateBps / 2, taxableMinor: taxable, amountMinor: tax - half });
    } else {
      taxLines.push({ kind: "igst", rateBps, taxableMinor: taxable, amountMinor: tax });
    }
  }
  const taxMinor = taxLines.reduce((s, t) => s + t.amountMinor, 0);
  return { subtotalMinor, discountMinor, shippingMinor, totalMinor, taxMinor, taxTreatment: intra ? "intra" : "inter", taxLines };
}
