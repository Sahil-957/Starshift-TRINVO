import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apportion, multiBuyDiscount, priceOrder } from "./pricing.ts";

const base = {
  lines: [{ unitPriceMinor: 149000, quantity: 2, taxRateBps: 1800 }],
  shippingFlatMinor: 9900,
  freeShippingOverMinor: null,
  gstin: "27ABCDE1234F1Z5",
  originState: "MH",
};

describe("priceOrder", () => {
  it("adds shipping and carves IGST out of an inter-state order", () => {
    const p = priceOrder({ ...base, destinationState: "KA" });
    assert.equal(p.subtotalMinor, 298000);
    assert.equal(p.totalMinor, 307900);
    assert.equal(p.taxTreatment, "inter");
    assert.equal(p.taxLines.length, 1);
    const [igst] = p.taxLines;
    assert.equal(igst.kind, "igst");
    assert.equal(igst.taxableMinor + igst.amountMinor, 307900, "tax-inclusive: taxable + tax = total");
    assert.equal(igst.amountMinor, 46968); // 307900 - round(307900/1.18)
  });

  it("splits CGST + SGST within the origin state, summing to the same tax", () => {
    const inter = priceOrder({ ...base, destinationState: "KA" });
    const intra = priceOrder({ ...base, destinationState: "MH" });
    assert.equal(intra.taxTreatment, "intra");
    assert.deepEqual(intra.taxLines.map((t) => [t.kind, t.rateBps]), [["cgst", 900], ["sgst", 900]]);
    assert.equal(intra.taxMinor, inter.taxMinor);
  });

  it("waives shipping over the threshold", () => {
    const p = priceOrder({ ...base, freeShippingOverMinor: 200000, destinationState: "KA" });
    assert.equal(p.shippingMinor, 0);
    assert.equal(p.totalMinor, 298000);
  });

  it("computes no tax for a shop without a GSTIN", () => {
    const p = priceOrder({ ...base, gstin: null, destinationState: "MH" });
    assert.equal(p.taxMinor, 0);
    assert.equal(p.taxTreatment, null);
    assert.equal(p.totalMinor, 307900);
  });
});

describe("multi-buy offer", () => {
  const offer = {
    tiers: [
      { minQty: 2, offMinor: 20000 },
      { minQty: 3, offMinor: 40000 },
    ],
    endsAt: "2026-11-27T00:00:00+05:30",
  };
  const during = new Date("2026-11-21T12:00:00+05:30");
  const one = { unitPriceMinor: 94900, quantity: 1, taxRateBps: 1800 };

  it("saves nothing on one item, the best tier reached on more, across designs", () => {
    assert.equal(multiBuyDiscount(offer, 1, during), 0);
    assert.equal(multiBuyDiscount(offer, 2, during), 20000);
    assert.equal(multiBuyDiscount(offer, 3, during), 40000);
    assert.equal(multiBuyDiscount(offer, 7, during), 40000);
    const p = priceOrder({ ...base, shippingFlatMinor: 0, lines: [one, { ...one, unitPriceMinor: 104900 }], multiBuy: offer, now: during, destinationState: "KA" });
    assert.equal(p.subtotalMinor, 199800);
    assert.equal(p.discountMinor, 20000);
    assert.equal(p.totalMinor, 179800);
  });

  it("stops at the end time and when there is no offer", () => {
    assert.equal(multiBuyDiscount(offer, 3, new Date("2026-11-27T00:00:00+05:30")), 0);
    assert.equal(multiBuyDiscount(null, 3, during), 0);
    const p = priceOrder({ ...base, lines: [{ ...one, quantity: 3 }], multiBuy: offer, now: new Date("2026-11-28"), destinationState: "KA" });
    assert.equal(p.discountMinor, 0);
  });

  it("taxes the price actually paid: taxable + tax = total after the saving", () => {
    const p = priceOrder({ ...base, shippingFlatMinor: 0, lines: [{ ...one, quantity: 3 }], multiBuy: offer, now: during, destinationState: "MH" });
    assert.equal(p.totalMinor, 3 * 94900 - 40000);
    const taxable = p.taxLines[0].taxableMinor;
    assert.equal(taxable + p.taxMinor, p.totalMinor);
  });

  it("judges free shipping on what is left after the saving", () => {
    const p = priceOrder({ ...base, shippingFlatMinor: 7900, freeShippingOverMinor: 180000, lines: [{ ...one, quantity: 2 }], multiBuy: offer, now: during, destinationState: "KA" });
    assert.equal(p.discountMinor, 20000);
    assert.equal(p.shippingMinor, 7900); // 1,898 − 200 = 1,698 is under 1,800
  });

  it("never takes off more than the goods cost", () => {
    const p = priceOrder({ ...base, lines: [{ ...one, unitPriceMinor: 10000, quantity: 3 }], multiBuy: offer, now: during, destinationState: "KA" });
    assert.equal(p.discountMinor, 30000);
    assert.equal(p.totalMinor, base.shippingFlatMinor);
  });

  it("apportions to the paisa", () => {
    assert.deepEqual(apportion(20000, [94900, 104900]), [9499, 10501]);
    assert.deepEqual(apportion(100, [1, 1, 1]), [34, 33, 33]);
    assert.equal(apportion(40001, [3, 5, 7]).reduce((a, b) => a + b), 40001);
    assert.deepEqual(apportion(500, [0, 0]), [0, 0]);
  });
});
