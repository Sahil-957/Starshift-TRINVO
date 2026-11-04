/**
 * Order totals and GST (proposal §3.7). Pure: no I/O, unit-tested in pricing.test.ts.
 * Prices are tax-inclusive, so tax is carved out of each line, never added on:
 *   taxable = round(gross × 10000 / (10000 + rate_bps)),  tax = gross − taxable
 * Shipping is taxed at the goods' rate (the highest rate in the order).
 */
export type PriceLine = { unitPriceMinor: number; quantity: number; taxRateBps: number };
export type TaxLine = { kind: "cgst" | "sgst" | "igst"; rateBps: number; taxableMinor: number; amountMinor: number };

export type PricingInput = {
  lines: PriceLine[];
  shippingFlatMinor: number;
  /** null: shipping always charged */
  freeShippingOverMinor: number | null;
  /** tax lines are only computed for a registered shop */
  gstin: string | null;
  originState: string | null;
  destinationState: string;
};

export function priceOrder(input: PricingInput) {
  const subtotalMinor = input.lines.reduce((s, l) => s + l.unitPriceMinor * l.quantity, 0);
  const free = input.freeShippingOverMinor !== null && subtotalMinor >= input.freeShippingOverMinor;
  const shippingMinor = free ? 0 : input.shippingFlatMinor;
  const totalMinor = subtotalMinor + shippingMinor;

  if (!input.gstin || !input.originState) {
    return { subtotalMinor, shippingMinor, totalMinor, taxMinor: 0, taxTreatment: null, taxLines: [] as TaxLine[] };
  }

  // group gross amounts by rate; shipping joins the highest goods rate
  const byRate = new Map<number, number>();
  for (const l of input.lines) byRate.set(l.taxRateBps, (byRate.get(l.taxRateBps) ?? 0) + l.unitPriceMinor * l.quantity);
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
  return { subtotalMinor, shippingMinor, totalMinor, taxMinor, taxTreatment: intra ? "intra" : "inter", taxLines };
}
