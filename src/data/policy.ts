/**
 * Return, refund and replacement policy, held as data so it can be edited in
 * one place — and later driven by the admin dashboard — rather than being
 * written into page copy.
 *
 * Keyed by fulfilment provider, because terms follow whoever makes and ships
 * the product. A product declares its provider; add a provider here before
 * adding a product that uses one.
 *
 * TINVO has adopted its fulfilment provider's terms as its own customer
 * policy. Every figure below is taken from the provider's published policy —
 * do not change one without changing it at the source first.
 *
 * VERIFIED 24 Oct 2026 against https://qikink.com/returns-and-refund/
 *
 * Two things this adoption does NOT do, and must not be edited to do:
 *  - It does not displace consumer law. Supplier terms are the provider's
 *    obligations to TINVO; a customer's statutory rights sit on top of them
 *    and cannot be signed away by a policy page.
 *  - It does not create a warranty. The provider publishes none for this
 *    product, so neither do we.
 */

export type Warranty = {
  months: number;
  covers: string;
};

export type FulfilmentPolicy = {
  id: string;
  /** Who manufactures and ships */
  provider: string;
  providerPolicyUrl: string;
  /** Days from delivery in which a customer must report a problem */
  reportWindowDays: number;
  /** What happens to a claim raised after the window closes */
  lateReport: string;
  /** Faults the provider will replace or refund once verified */
  qualifying: string[];
  /** Evidence the provider requires before it will verify a claim */
  evidence: string[];
  /** Conditions under which a claim will not be approved */
  exclusions: string[];
  /** Working days from approval to the provider acting on it */
  resolutionDays: string;
  /** Days without a delivery attempt before a shipment counts as lost */
  lostShipment: { airDays: number; surfaceDays: number };
  /** What happens to stock that comes back to the provider */
  returnedStock: { heldDays: number; reshipFee: string };
  /**
   * Commercial warranty, over and above consumer-law rights.
   * `null` means no warranty has been confirmed for this product — do not
   * advertise a duration, a badge or a "manufacturer warranty" while null.
   */
  warranty: Warranty | null;
};

export const fulfilmentPolicies: Record<string, FulfilmentPolicy> = {
  qikink: {
    id: "qikink",
    provider: "Qikink",
    providerPolicyUrl: "https://qikink.com/returns-and-refund/",
    reportWindowDays: 7,
    lateReport:
      "Reported after 7 days, a remake is still possible but is chargeable — the manufacturer treats it as a reprint rather than a claim.",
    qualifying: [
      "Damaged in transit",
      "Manufacturing defect",
      "Misprinted artwork",
      "Wrong item delivered",
    ],
    evidence: [
      "An unboxing video that runs from the sealed parcel to the product in your hand, without a cut.",
      "Photographs of the fault itself, in focus and in daylight if you can.",
      "Photographs of the original packaging, including the courier label.",
      "If the parcel itself arrived damaged, a photograph of the outer courier cover as it was delivered.",
    ],
    exclusions: [
      "Reported more than 7 days after delivery — chargeable as a reprint instead.",
      "No unboxing video, where the cause of the damage cannot otherwise be established.",
      "Parcels opened with scissors or a blade, where that is what caused the damage and there is no unboxing video or photograph of the courier cover.",
      "Changing your mind, or ordering the wrong thing, on a made-to-order product.",
      "Small shifts in colour between screen and print, which are inherent to the process rather than a defect.",
      "Delivery to a pin code that stops being serviceable after the order is placed.",
    ],
    resolutionDays: "2–3 working days from approval",
    lostShipment: { airDays: 15, surfaceDays: 20 },
    returnedStock: { heldDays: 100, reshipFee: "₹20 + 18% GST per item, plus shipping" },
    /**
     * Qikink publishes no warranty period for the 20 oz tumbler — its policy
     * covers defect, damage and misprint only. This is a settled answer, not
     * an open question: there is no warranty to advertise. Fill this in only
     * if the supplier later confirms a term in writing for this exact product.
     */
    warranty: null,
  },
};

/** Every product is made to order by the provider named here. */
export const defaultFulfilment = "qikink";

export const getPolicy = (id: string = defaultFulfilment) =>
  fulfilmentPolicies[id] ?? fulfilmentPolicies[defaultFulfilment];

/**
 * What is still open after adopting the provider's terms. These are things
 * the provider's policy does not answer, so they must not appear as
 * commitments anywhere on the site until they are settled.
 */
export const unresolvedTerms = [
  "Customer-facing refund timing. The provider credits TINVO within 2–3 working days of approval; how long the customer then waits for the money to land depends on the payment gateway, which is not selected yet.",
  "Who pays return shipping on an approved claim, and whether a faulty item has to be sent back at all — the provider's policy does not say.",
  "Wrong-item deliveries: listed by the provider as a return cause with no stated refund or replacement rule.",
  "Statutory rights for made-to-order goods under Indian consumer law. The provider's terms are business-to-business and several of them — the unserviceable-pin-code exclusion in particular — may not be enforceable against a consumer. Needs a legal review before launch.",
];
