/**
 * Customer-facing support content: shipping, returns, care, bulk and FAQ.
 *
 * FIGURES ARE PROVISIONAL. Delivery windows, charges, minimums and lead times
 * below are placeholders until courier and supplier contracts are signed.
 * Pages carrying numbers set `provisional`, which renders a visible notice —
 * clear every one of those before launch.
 */

export type Section = {
  heading: string;
  /** Paragraphs */
  body?: string[];
  /** Key/value rows, rendered as a definition list */
  rows?: [string, string][];
  /** Bulleted points */
  points?: string[];
  /** Question and answer pairs */
  qa?: { q: string; a: string }[];
};

export type SupportPage = {
  slug: string;
  /** Nav and card label */
  label: string;
  title: string;
  lede: string;
  /** One-liner for the support index */
  summary: string;
  accent: string;
  sections: Section[];
  /** Renders the "figures are provisional" notice */
  provisional?: boolean;
};

export const supportPages: SupportPage[] = [
  {
    slug: "shipping",
    label: "Shipping",
    title: "Getting it to you",
    lede: "Where we ship, how long it takes and what it costs.",
    summary: "Dispatch times, delivery windows, charges and tracking.",
    accent: "var(--color-cobalt)",
    provisional: true,
    sections: [
      {
        heading: "Where we ship",
        body: [
          "We ship across India at launch. International shipping is not open yet — if you are outside India and want a piece, write to us and we will tell you honestly when we can get there.",
        ],
      },
      {
        heading: "Dispatch and delivery",
        body: [
          "Orders are packed and handed to the courier within two working days. The windows below start from dispatch, not from the moment you order.",
        ],
        rows: [
          ["Metro cities", "2–4 working days"],
          ["Other cities and towns", "4–7 working days"],
          ["Remote and north-east pin codes", "7–10 working days"],
          ["Dispatch cut-off", "2 working days from order"],
        ],
      },
      {
        heading: "What it costs",
        rows: [
          ["Orders over ₹1,999", "Free"],
          ["Orders under ₹1,999", "₹79 flat"],
          ["Cash on delivery", "Not available at launch"],
        ],
      },
      {
        heading: "Tracking",
        body: [
          "You get a tracking link by email and SMS the moment the parcel leaves us. If the tracking has not moved for three working days, tell us — we will chase the courier rather than ask you to.",
        ],
      },
      {
        heading: "If it arrives damaged",
        body: [
          "Photograph the parcel before you unpack it fully and send the pictures within 48 hours of delivery. Transit damage is our problem, not yours: we replace the piece and arrange the pickup.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    label: "Returns & warranty",
    title: "If it is not right",
    lede: "The return window, what the warranty covers, and how refunds work.",
    summary: "Return window, warranty cover, exclusions and refund timing.",
    accent: "var(--color-jade)",
    provisional: true,
    sections: [
      {
        heading: "Returns",
        body: [
          "You have 7 days from delivery to return a piece for any reason, including simply not liking the design in person. It needs to be unused and back in its box — a tumbler that has held coffee cannot be resold, so we cannot take that one back.",
        ],
        rows: [
          ["Window", "7 days from delivery"],
          ["Condition", "Unused, original packaging"],
          ["Return shipping", "Free if the fault is ours, otherwise ₹99"],
          ["Refund issued", "Within 5 working days of the piece reaching us"],
        ],
      },
      {
        heading: "How to start one",
        body: [
          "Write to hello@tinvo.store with your order number and one line about what went wrong. We arrange the pickup. There is no form to fill in and nobody will try to talk you out of it.",
        ],
      },
      {
        heading: "Warranty",
        body: [
          "Every piece is covered for 12 months against manufacturing defects. If the vacuum seal fails, the lid stops sealing, or the print lifts under normal use, we replace it.",
        ],
        rows: [
          ["Term", "12 months from delivery"],
          ["Vacuum seal failure", "Covered"],
          ["Lid or gasket defect", "Covered"],
          ["Print lifting or peeling", "Covered"],
        ],
      },
      {
        heading: "What the warranty does not cover",
        points: [
          "Dents and scratches from drops or knocks.",
          "Print damage caused by dishwasher or abrasive cleaning — see the care guide.",
          "Discolouration from bleach or strong solvents.",
          "Normal wear: the matte finish softening on high-contact areas over time.",
          "Pieces bought from anyone other than us.",
        ],
      },
    ],
  },
  {
    slug: "care",
    label: "Care",
    title: "Keeping it alive",
    lede: "A printed stainless barrel lasts years if you treat it properly. This is the whole method.",
    summary: "Washing, what to avoid, lid maintenance and stain removal.",
    accent: "var(--color-bronze)",
    sections: [
      {
        heading: "Every day",
        body: [
          "Rinse it out when you are done with it, rather than at the end of the week. Warm water, mild dish soap and a soft sponge gets everything. Leave it upside down with the lid off so the inside dries properly.",
        ],
      },
      {
        heading: "Never do this",
        points: [
          "No dishwasher. The heat and the detergent will lift a full-wrap print, and that is not covered by the warranty.",
          "No microwave. It is a steel vacuum vessel; it will arc.",
          "No freezer. Freezing liquid expands and can break the vacuum seal.",
          "No bleach, no chlorine, no steel wool, no abrasive powder.",
          "Do not soak the whole thing overnight — water works into the lid assembly.",
        ],
      },
      {
        heading: "The lid",
        body: [
          "The lid is where every tumbler actually fails. Pull the silicone gasket out once a week, wash both parts separately and let them dry before you reassemble. A gasket left wet under the rim is what makes a bottle smell.",
        ],
      },
      {
        heading: "Stains and smells",
        rows: [
          ["Coffee or tea staining", "Warm water with a spoon of bicarbonate of soda, left 30 minutes"],
          ["Lingering smell", "The same soak, then dry fully with the lid off"],
          ["Hard-water marks", "A rinse with diluted white vinegar, then wash normally"],
          ["Stubborn residue", "A soft bottle brush — never anything metal"],
        ],
      },
      {
        heading: "Looking after the print",
        body: [
          "The artwork is printed onto the barrel rather than stuck on, so it will not peel in ordinary use. It does not like sustained heat or grit: hand wash it, keep it out of the dishwasher, and do not scrub the outside with anything you would not use on a pair of glasses.",
        ],
      },
    ],
  },
  {
    slug: "bulk",
    label: "Bulk & corporate",
    title: "Ordering in quantity",
    lede: "Gifting, events and team orders — what we can do, and what we will not pretend to.",
    summary: "Minimums, lead times, branding limits and how to enquire.",
    accent: "var(--color-plum)",
    provisional: true,
    sections: [
      {
        heading: "Who this is for",
        body: [
          "Teams buying joining gifts, companies putting something decent in a conference bag, and anyone who needs more than ten pieces at once. The barrel is the same one we sell individually — there is no cheaper version kept back for bulk buyers.",
        ],
      },
      {
        heading: "Quantities and lead times",
        rows: [
          ["10–49 pieces", "From stock, about 1 week"],
          ["50–199 pieces", "3–4 weeks"],
          ["200+ pieces", "5–6 weeks"],
          ["Minimum order", "10 pieces"],
        ],
      },
      {
        heading: "Branding",
        body: [
          "We can add a logo to an existing design, or print artwork of yours across the full wrap. What we will not do is a rushed co-brand that ruins the design underneath — if your logo does not sit well on a piece, we will say so and suggest one where it does.",
        ],
        points: [
          "Single-colour logo placement on any catalogue design.",
          "Full custom wrap from your artwork, print-ready files only.",
          "Individual gift boxing and named cards.",
          "No deadline we cannot actually hit — you get the real date.",
        ],
      },
      {
        heading: "How to enquire",
        body: [
          "Write to studio@tinvo.store with the quantity, the date you need them by and what the branding has to do. You get a real quote with a real lead time, usually within two working days.",
        ],
      },
    ],
  },
  {
    slug: "faq",
    label: "FAQ",
    title: "Questions we actually get",
    lede: "The product, the ordering and the practical bits.",
    summary: "Short answers on product, orders, shipping and care.",
    accent: "var(--color-rose)",
    sections: [
      {
        heading: "The product",
        qa: [
          {
            q: "How long does it keep a drink hot or cold?",
            a: "We are not publishing a number until it has been independently tested. It is a double-wall vacuum barrel, so it performs like one — but a figure printed on a website means nothing without a lab behind it, and we would rather stay quiet than invent one.",
          },
          {
            q: "Is it leak-proof?",
            a: "The lid is a press-fit with a sliding sip closure. It will not leak in a bag held upright. It is not designed to go in sideways with the closure open.",
          },
          {
            q: "Which size should I get?",
            a: "350 ml suits a desk and a single coffee. 600 ml covers a commute, a gym session or a morning without a refill. The 600 still clears a standard car cup holder.",
          },
          {
            q: "Will the print wear off?",
            a: "Not under hand washing. It will lift in a dishwasher, which is the one thing we ask you not to do.",
          },
          {
            q: "Is the steel food grade?",
            a: "304 stainless on every interior surface, with no inner coating that can flake off.",
          },
        ],
      },
      {
        heading: "Ordering",
        qa: [
          {
            q: "Can I buy one yet?",
            a: "Not quite. Checkout is not live while we finish the first production run, and the catalogue, prices and specifications on the site stay provisional until it is.",
          },
          {
            q: "Can I personalise a design?",
            a: "Not at the moment. Every piece in the range is a finished design rather than a blank to decorate. Custom work is available on bulk orders.",
          },
          {
            q: "Do you take cash on delivery?",
            a: "Not at launch. Cards, UPI and net banking when checkout opens.",
          },
        ],
      },
      {
        heading: "Shipping and returns",
        qa: [
          {
            q: "Do you ship outside India?",
            a: "Not yet. Write to us and we will tell you honestly when we expect to.",
          },
          {
            q: "What if I do not like the design in person?",
            a: "Send it back within 7 days, unused and boxed, and you get a refund. A design reads differently in your hand than on a screen, and that is a fair reason to return it.",
          },
          {
            q: "Something arrived broken. Now what?",
            a: "Photograph it within 48 hours and email us. We replace it and arrange the pickup; you do not pay for transit damage.",
          },
        ],
      },
    ],
  },
];

export const getSupportPage = (slug: string) =>
  supportPages.find((p) => p.slug === slug);
