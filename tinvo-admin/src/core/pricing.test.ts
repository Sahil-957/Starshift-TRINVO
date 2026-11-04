import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { priceOrder } from "./pricing.ts";

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
