/**
 * Customer-facing support content: shipping, returns, care, bulk and FAQ.
 *
 * Delivery windows and bulk lead times are estimates until confirmed with the
 * printing and courier partners; pages carrying them set `provisional`, which
 * renders a visible notice. Shipping charges come from the admin (see `shipping`).
 */
import { formatPrice, shipping } from "./products";

const shippingRows: [string, string][] =
  shipping.flat === 0
    ? [["Every order, anywhere in India", "Free"]]
    : shipping.freeOver !== null
      ? [
          [`Orders of ${formatPrice(shipping.freeOver)} or more`, "Free"],
          [`Orders under ${formatPrice(shipping.freeOver)}`, `${formatPrice(shipping.flat)} flat`],
        ]
      : [["Every order", `${formatPrice(shipping.flat)} flat`]];

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
          "We ship across India. International shipping is not open yet — if you are outside India and want a piece, write to us and we will tell you honestly when we can get there.",
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
        rows: [...shippingRows, ["Cash on delivery", "Not available"]],
      },
      {
        heading: "Tracking",
        body: [
          "You get a tracking link by email the moment the parcel leaves us, and you can check it any time on Track your order. If the tracking has not moved for three working days, tell us — we will chase the courier rather than ask you to.",
        ],
      },
      {
        heading: "If it arrives damaged",
        body: [
          "Record an unboxing video from the sealed parcel, and email it with photos of the damage within 7 days of delivery. Transit damage is our problem, not yours: once the claim is verified we replace the piece or refund you. The full process is under Returns & refunds.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    label: "Returns & refunds",
    title: "If something is wrong with it",
    lede: "How to report a damaged, defective, misprinted or incorrect item, what we need from you, and how long it takes to put right.",
    summary: "Reporting a fault, the evidence required, and how claims are resolved.",
    accent: "var(--color-jade)",
    sections: [
      {
        heading: "If your order arrives faulty",
        body: [
          "Tell us within 7 days of delivery and we will put it right. That covers a tumbler damaged in transit, a manufacturing defect, a misprinted design, or the wrong item in the box.",
          "Email starshift07@gmail.com with your order number and the evidence below. Claims are verified before they are approved — we cannot promise a refund or replacement in advance of that check, because the fault has to be established before anything is remade.",
        ],
        rows: [
          ["Report within", "7 days of delivery"],
          ["Covers", "Transit damage, defects, misprints, wrong item"],
          ["Once approved", "Remade and dispatched in 2\u20133 working days"],
          ["Or", "Refunded to your original payment method"],
        ],
      },
      {
        heading: "What we need from you",
        body: [
          "Claims fail without these, so please gather them before you write. The unboxing video is the one that matters most: it is what establishes whether a fault was made or happened in transit.",
        ],
        points: [
          "An unboxing video that runs from the sealed parcel to the product in your hand, without a cut.",
          "Photographs of the fault itself, in focus and in daylight if you can.",
          "Photographs of the original packaging, including the courier label.",
          "If the parcel itself arrived damaged, a photograph of the outer courier cover as it was delivered.",
        ],
      },
      {
        heading: "A practical word on opening the parcel",
        body: [
          "Film it, and open it with your hands rather than a blade. If a parcel is opened with scissors and the product underneath is cut, the claim cannot be verified without that video. This is the most common reason a claim is refused, and it is entirely avoidable.",
          "If the courier hands you something visibly dented or torn, write that on their delivery sheet before you sign, and photograph the parcel before you open it.",
        ],
      },
      {
        heading: "Replacement or refund",
        body: [
          "Where both are possible on an approved claim, you choose. Say which you would prefer when you report the problem.",
          "A replacement is remade and dispatched within 2\u20133 working days of approval; delivery time on top of that depends on your pin code. A refund is issued to your original payment method — it goes back through PayU and usually appears within 5–7 working days, depending on your bank.",
        ],
      },
      {
        heading: "After 7 days",
        body: [
          "The 7-day window is when a fault can be claimed. Past it, we can still remake a piece for you, but it becomes a reprint rather than a claim and is charged as one. If something has gone wrong and you are outside the window, write to us anyway — we would rather look at it than turn you away on a technicality.",
        ],
      },
      {
        heading: "Changing your mind",
        body: [
          "Every tumbler is printed to order, one at a time, after you buy it. Nothing sits on a shelf waiting. A piece made for you cannot be resold, so change-of-mind returns are not available on made-to-order products — if you ordered the wrong thing, the way forward is a new order.",
          "This is not a no-returns clause and it does not touch your rights under consumer law. Anything faulty, not as described, or not fit for purpose is covered by the process above, whatever this section says.",
        ],
      },
      {
        heading: "Colour, and what counts as a defect",
        body: [
          "Printing is never an exact match for a backlit screen. A small shift in tone between what you saw online and what arrives is inherent to the process and is not treated as a defect. A design that is smudged, misaligned, incomplete or simply the wrong artwork is a defect, and is covered.",
        ],
      },
      {
        heading: "If your order never arrives",
        rows: [
          ["Air shipping", "Chased after 15 days with no delivery attempt"],
          ["Surface shipping", "Chased after 20 days with no delivery attempt"],
          ["Confirmed lost", "Remade and reshipped, or refunded"],
        ],
        body: [
          "If tracking stalls, tell us rather than waiting it out. Once a parcel passes the windows above without a delivery attempt, or the courier confirms it lost, we remake and reship it or refund you — your choice.",
          "One thing to watch: if a pin code stops being serviceable after you have ordered, a parcel can be returned to origin, and our manufacturer does not refund those. Please check that your address is deliverable before you order, and tell us straight away if you need to change it.",
        ],
      },
      {
        heading: "Warranty",
        body: [
          "There is no commercial warranty on this tumbler. Our manufacturer publishes none for it, so we do not advertise one — no period, no badge, no claim of manufacturer cover.",
          "That is a statement about an extra guarantee on top, not about your rights. Your protections under applicable consumer law apply regardless, and the fault process above is how you use them. If warranty cover is ever confirmed, it will be published here.",
        ],
      },
      {
        heading: "How to reach us",
        body: [
          "Email starshift07@gmail.com with your order number and a line about what is wrong. A person reads it. There is no form and no ticket queue.",
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
          "No dishwasher. Our manufacturer does not certify the print for it, so hand washing is the only method we will stand behind.",
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
          "The artwork is sublimated into the surface coating rather than stuck on top, using fade-proof OEKO-TEX inks, so it will not peel in ordinary use. It does not like sustained heat or grit: hand wash it, keep it out of the dishwasher, and do not scrub the outside with anything you would not use on a pair of glasses.",
        ],
      },
      {
        heading: "The straw",
        body: [
          "Every tumbler ships with a reusable metal straw. Run the brush through it after anything other than water — a straw is the one part nobody remembers to clean, and it is the part you put in your mouth.",
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
          "Write to starshift07@gmail.com with the quantity, the date you need them by and what the branding has to do. You get a real quote with a real lead time, usually within two working days.",
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
            a: "No — the lid is splash-proof, not leak-proof. It handles a knock and a car journey upright, and it will leak if you put it in a bag on its side. We would rather say that here than have you find out.",
          },
          {
            q: "Which size should I get?",
            a: "There is only one: 20 oz, about 591 ml. It covers a commute, a session or a morning at a desk without a refill. We would rather make one size properly than three badly.",
          },
          {
            q: "Will the print wear off?",
            a: "The artwork is sublimated into the coating rather than stuck on top, with fade-proof OEKO-TEX inks. Hand wash it and it stays put. We still keep it out of the dishwasher.",
          },
          {
            q: "Is the steel food grade?",
            a: "304 stainless, double-wall vacuum insulated. It ships with a reusable metal straw.",
          },
        ],
      },
      {
        heading: "Ordering",
        qa: [
          {
            q: "How do I order?",
            a: "Pick a design, add it to your cart (or tap Buy now) and pay securely through PayU with UPI, a card or netbanking. You get an email confirmation straight away, and another with tracking when it ships. Each tumbler is printed after you order.",
          },
          {
            q: "Can I personalise a design?",
            a: "Not at the moment. Every piece in the range is a finished design rather than a blank to decorate. Custom work is available on bulk orders.",
          },
          {
            q: "Do you take cash on delivery?",
            a: "No. You pay securely online through PayU with UPI, a card or netbanking.",
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
            q: "Can I return my TINVO tumbler?",
            a: "If it is faulty, yes — report it within 7 days of delivery and we will replace or refund it once the claim is verified. If you have simply changed your mind, generally no: every piece is printed to order after you buy it, so there is no shelf to put it back on. That is not a no-returns clause, and it does not affect your rights under consumer law.",
          },
          {
            q: "What if my product arrives damaged?",
            a: "Email starshift07@gmail.com within 7 days with your unboxing video, photos of the damage and photos of the original packaging. If the parcel itself was damaged, photograph the courier cover too, and note the damage on the courier's sheet before you sign.",
          },
          {
            q: "What if the printed design is defective?",
            a: "A misprint is treated exactly like transit damage: report it within 7 days with the same evidence and we remake it. Printing is never a perfect colour match to a screen, so a slight shift in tone is expected variation rather than a defect — a wrong, smudged or misaligned design is not.",
          },
          {
            q: "What evidence do I need to submit?",
            a: "An unboxing video with no cut in it, photos of the fault, and photos of the original packaging. The video is the one that matters: our manufacturer will not verify a claim without it, because it is what shows whether a fault was made or happened in transit.",
          },
          {
            q: "Can I request a replacement instead of a refund?",
            a: "Yes. Where both are possible on an approved claim, you choose. Say which you would prefer when you report the problem.",
          },
          {
            q: "How are approved refunds processed?",
            a: "To your original payment method. A replacement, if you would rather have one, is remade and dispatched within 2\u20133 working days of approval. Refunds go back through PayU and usually reach your account within 5–7 working days, depending on your bank.",
          },
          {
            q: "Does my tumbler have a warranty?",
            a: "No. Our manufacturer publishes no warranty for this product, so we do not advertise one. That is about an extra commercial guarantee only — your rights under applicable consumer law stand regardless, and anything faulty, not as described or not fit for purpose is covered by the fault process.",
          },
          {
            q: "What should I do if my order is lost?",
            a: "Tell us as soon as tracking stalls. We chase it at 15 days without a delivery attempt on air shipping, or 20 days on surface. Once it is confirmed lost we remake and reship it, or refund you — your choice. You will not be left chasing the courier yourself.",
          },
        ],
      },
    ],
  },
  {
    slug: "privacy",
    label: "Privacy policy",
    title: "Your data, plainly",
    lede: "What we collect, why, who we share it with and how to have it changed or deleted. Last updated 9 November 2026.",
    summary: "What we collect, who we share it with and your rights.",
    accent: "var(--color-jade)",
    sections: [
      {
        heading: "Who we are",
        body: [
          "TINVO (tinvo.starshift.in) is run by Starshift in India. We are responsible for the personal data described here. For anything about your data, email starshift07@gmail.com; we reply within 7 days and resolve requests within 30.",
        ],
      },
      {
        heading: "What we collect, and why",
        rows: [
          ["When you order", "Name, email, phone, delivery address and what you bought: to make, ship and support your order, and to send order and tracking emails."],
          ["When you pay", "PayU handles your card, UPI or bank details. We never see or store them; we keep only PayU's transaction reference and whether it succeeded."],
          ["If you create an account", "Name, email and a password stored only as a one-way hash, or your name and email from Google if you sign in with Google. Used to show your orders and fill in checkout."],
          ["If you write a review", "Your rating, review, and first name with last initial (shown publicly once we approve it). We check it against your order but never publish the order or your email."],
          ["If you join the drop list", "Your email, to tell you about new designs. Reply to any of those emails to come off it."],
          ["When you browse", "Basic server logs (address, browser, pages, time) kept briefly for security and fixing faults. We use no advertising or analytics trackers."],
        ],
      },
      {
        heading: "Cookies and storage",
        body: [
          "We use one cookie when you're signed in, to keep you signed in (30 days), and a short-lived one during Google sign-in. Your cart is saved in your own browser. There are no advertising, tracking or third-party analytics cookies.",
        ],
      },
      {
        heading: "Who we share it with",
        body: ["Only the services needed to run the shop, each only with what it needs. We never sell your data or share it for advertising."],
        rows: [
          ["PayU", "Takes your payment."],
          ["Qikink", "Prints and ships your tumbler: receives your name, phone, address and the design."],
          ["Courier partners", "Deliver the parcel, via Qikink: name, phone and address."],
          ["Google", "Hosts our servers (Google Cloud, India) and sends our emails (Gmail); handles sign-in if you choose Continue with Google."],
          ["Neon", "Hosts our database (in Singapore)."],
        ],
        points: ["We may also disclose data where Indian law requires it, for example to tax authorities or under a court order."],
      },
      {
        heading: "How long we keep it",
        points: [
          "Orders and invoices: 8 years, as Indian tax and accounting law requires.",
          "Your account: until you ask us to delete it. Sign-in sessions expire after 30 days; email links after 1–48 hours.",
          "Drop list: until you unsubscribe.",
          "Server logs: up to 30 days.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Under India's Digital Personal Data Protection Act, 2023, you can ask us for a summary of the data we hold about you, have it corrected or completed, have it erased (except what the law makes us keep, such as invoices), withdraw consent, and nominate someone to act for you. Email starshift07@gmail.com from the address you use with us. If you're not satisfied with our answer, you can complain to the Data Protection Board of India.",
        ],
      },
      {
        heading: "Keeping it safe",
        body: [
          "Everything travels over HTTPS. Passwords are stored only as bcrypt hashes and checked against known data leaks; sign-in links and sessions are random, single-purpose and stored only in hashed form. Access to the admin is limited to the people who run the shop.",
        ],
      },
      {
        heading: "Children",
        body: ["The shop is for adults. If you are under 18, please order with a parent or guardian."],
      },
      {
        heading: "Changes",
        body: ["If we change this policy we update the date at the top, and for significant changes we email account holders before they take effect."],
      },
    ],
  },
  {
    slug: "terms",
    label: "Terms of service",
    title: "The terms of buying from us",
    lede: "The agreement between you and TINVO when you use this site or place an order. Last updated 9 November 2026.",
    summary: "Orders, pricing, accounts, reviews and the legal small print.",
    accent: "var(--color-bronze)",
    sections: [
      {
        heading: "Who you're dealing with",
        body: [
          "This site and shop are run by Starshift in India under the TINVO name (\"we\", \"us\"). By using the site or placing an order you agree to these terms, together with our Privacy policy, Shipping, and Returns & refunds pages, which form part of them. Contact: starshift07@gmail.com.",
        ],
      },
      {
        heading: "Orders",
        points: [
          "Your order is a request to buy. It's accepted once your payment succeeds and you receive our order confirmation email.",
          "Each tumbler is printed for you after you order. Once printing has started we can't cancel or change the order, except as set out under Returns & refunds.",
          "If we can't fulfil an order (for example a design can't be printed, or the address can't be served) we cancel it and refund you in full.",
          "Orders are for personal use. We may decline orders that look like resale or fraud.",
        ],
      },
      {
        heading: "Prices and payment",
        points: [
          "Prices are in Indian rupees and include GST. Shipping is shown before you pay.",
          "Payment is taken online through PayU (UPI, cards, netbanking). We don't offer cash on delivery.",
          "If a price on the site is clearly wrong, we'll tell you and you can confirm at the right price or get a full refund.",
        ],
      },
      {
        heading: "The product",
        body: [
          "We show each design and colour as accurately as we can, but screens differ and printing on a curved metal surface varies slightly from piece to piece; small variations in colour and placement are part of a made-to-order product and are not defects. Care instructions are on the Care page.",
        ],
      },
      {
        heading: "Delivery, returns and refunds",
        body: [
          "Delivery is covered on the Shipping page, and faults, damage and refunds on the Returns & refunds page. Nothing in these terms affects your rights under the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.",
        ],
      },
      {
        heading: "Your account",
        points: [
          "Keep your password private; you're responsible for activity on your account.",
          "Give us accurate details, and use an email you own: orders are linked to accounts by email.",
          "You can ask us to close your account at any time. We may suspend accounts used for fraud or abuse.",
        ],
      },
      {
        heading: "Reviews",
        body: [
          "Only buyers with a paid order can review a design. Reviews must be honest and about the product; we may decline or remove reviews that are abusive, unlawful, off-topic or contain personal details. You let us show your review, with your first name and last initial, on the site.",
        ],
      },
      {
        heading: "Designs and content",
        body: [
          "The TINVO name, designs, photos and text on this site belong to us. Buying a tumbler gives you the tumbler, not the right to reproduce its design. Please don't copy, scrape or reuse the site's content without permission.",
        ],
      },
      {
        heading: "Our responsibility",
        body: [
          "We're responsible for losses you suffer that are a foreseeable result of us breaking these terms or failing to take reasonable care, up to the amount you paid for the order concerned. We aren't responsible for losses that weren't foreseeable, for business losses, or for misuse of the product against its care instructions. Nothing here limits liability that can't be limited under Indian law.",
        ],
      },
      {
        heading: "Disputes",
        body: [
          "If something goes wrong, email us first: most things are fixed fastest that way. These terms are governed by the laws of India, and the courts of India have jurisdiction. You can also approach a consumer commission under the Consumer Protection Act, 2019.",
        ],
      },
      {
        heading: "Grievance officer",
        body: [
          "As required by the Consumer Protection (E-Commerce) Rules, 2020: Sahil Ambekar, Starshift, starshift07@gmail.com. We acknowledge complaints within 48 hours and resolve them within one month.",
        ],
      },
      {
        heading: "Changes",
        body: ["We may update these terms; the version in force when you place an order applies to that order."],
      },
    ],
  },
];

export const getSupportPage = (slug: string) =>
  supportPages.find((p) => p.slug === slug);
