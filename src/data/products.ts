/**
 * Central catalogue for the TINVO storefront.
 *
 * Each entry is a DESIGN, not a colour option. TINVO sells its own
 * original artwork printed on one stainless barrel. Customer personalisation
 * is deliberately not part of the storefront yet.
 *
 * PHOTOGRAPHY IS DEFERRED (phase 2). Every `images` array below is empty on
 * purpose, so each frame renders a labelled development placeholder rather
 * than a stand-in product shot. No component changes are needed to fill them:
 * drop files into `public/products/` and add entries here.
 *
 *   images: [
 *     { file: "prism-main.jpg", alt: "Prism, full wrap", kind: "main" },
 *     { file: "prism-back.jpg", alt: "Prism, reverse", kind: "angle" },
 *   ]
 *
 * The first entry is the lead shot; the rest become gallery thumbnails.
 * Portrait 4:5, >=1600px tall, shot on a dark ground.
 *
 * NAMES, PRICES, PALETTES AND SPECS below are placeholders for layout only.
 * No TINVO artwork has been selected yet — nothing here is a final design.
 */

/** One photograph of a product. Files live in `public/products/`. */
export type ProductImage = {
  /** Filename inside /public/products */
  file: string;
  /** What the shot shows — used as alt text */
  alt: string;
  /** Shot type; the first entry in `images` is the lead shot */
  kind: "main" | "angle" | "detail" | "lifestyle";
};

export type Product = {
  slug: string;
  name: string;
  /** One line under the name on cards */
  tagline: string;
  /** Editorial paragraph for the product page */
  description: string;
  price: number;
  capacityMl: number;
  /** How the artwork is applied to the barrel */
  print: string;
  /** Shots for this product. Empty until photography lands (phase 2). */
  images: ProductImage[];
  /** Tints the key light behind the product so each frame is lit differently */
  tone: string;
  /** Drives this design's UI colour: index, swatches, hover bar, chips */
  accent: string;
  /** Three colours pulled from the artwork, shown as swatches on the card */
  palette: [string, string, string];
  /** Quiz tags — see lib/quiz.ts */
  traits: string[];
  featured?: boolean;
};

export const products: Product[] = [
  {
    slug: "monolith",
    name: "Monolith",
    tagline: "One block of graphite, nothing else",
    description:
      "The quietest design we make: a single graphite field broken by one hairline. Drawn to be the thing you stop noticing by the second week, which is the highest compliment a desk object can earn.",
    price: 1490,
    capacityMl: 600,
    print: "Full-wrap, matte",
    images: [],
    tone: "#9fa6b2",
    accent: "#9aa0a8",
    palette: ["#17171a", "#4a4a52", "#9aa0a8"],
    traits: ["minimal", "desk", "dark", "large", "mono"],
    featured: true,
  },
  {
    slug: "ivory-dune",
    name: "Ivory Dune",
    tagline: "Drifting sand, drawn in four tones",
    description:
      "Layered dune ridges in bone, sand and a single burnt line, printed so the lightest tone sits almost flush with the barrel. The design we reach for when the tumbler sits next to paper, linen and light wood.",
    price: 1490,
    capacityMl: 600,
    print: "Full-wrap, matte",
    images: [],
    tone: "#e8d9c0",
    accent: "#c08a4e",
    palette: ["#efe5d4", "#d2bc96", "#a8703a"],
    traits: ["minimal", "desk", "light", "large", "gift", "earth"],
    featured: true,
  },
  {
    slug: "ember",
    name: "Ember",
    tagline: "A burn mark that never quite goes out",
    description:
      "Our loudest design. A terracotta field with a brass seam running the full height of the barrel, drawn to catch the light at one angle and disappear at every other. Built to be the single bright object on a desk of neutrals.",
    price: 1590,
    capacityMl: 600,
    print: "Full-wrap, gloss",
    images: [],
    tone: "#c87a46",
    accent: "#d9733c",
    palette: ["#8f3f1e", "#c87a46", "#e8b878"],
    traits: ["bold", "desk", "warm", "large", "gift", "earth"],
    featured: true,
  },
  {
    slug: "sage-field",
    name: "Sage Field",
    tagline: "Topographic lines, field-guide green",
    description:
      "Contour lines lifted from a survey map, redrawn in dusty olive over bone. Sits somewhere between field gear and tableware, which is why it tends to end up in a backpack side pocket rather than on a desk.",
    price: 1490,
    capacityMl: 600,
    print: "Full-wrap, matte",
    images: [],
    tone: "#8d9a7f",
    accent: "#8fa070",
    palette: ["#4e5a44", "#8d9a7f", "#d6cdb6"],
    traits: ["outdoors", "travel", "large", "bold", "earth"],
    featured: true,
  },
  {
    slug: "midnight-steel",
    name: "Midnight Steel",
    tagline: "Indigo over brushed metal",
    description:
      "A deep indigo wash printed thin enough that the brushed stainless reads through it, so the barrel shifts between blue and bare metal depending on the room. The most forgiving design in the range over a long life.",
    price: 1690,
    capacityMl: 600,
    print: "Translucent wrap over brushed steel",
    images: [],
    tone: "#8fa4d4",
    accent: "#6f86c4",
    palette: ["#1e2738", "#44557c", "#c4cbd4"],
    traits: ["minimal", "travel", "dark", "large", "gift", "cool"],
    featured: true,
  },
  {
    slug: "prism",
    name: "Prism",
    tagline: "The mark, split into its spectrum",
    description:
      "Our own prism refracted across the full wrap — violet through cobalt into a single rose edge. The one design in the range that behaves like a poster rather than a finish, and the one people pick up first.",
    price: 1690,
    capacityMl: 600,
    print: "Full-wrap, gloss",
    images: [],
    tone: "#8a6cf0",
    accent: "#8a6cf0",
    palette: ["#3b2f8f", "#5f7fe0", "#d0507a"],
    traits: ["bold", "desk", "large", "gift", "cool"],
    featured: true,
  },
  {
    slug: "compact-noir",
    name: "Compact Noir",
    tagline: "The 350 ml, in black and brass",
    description:
      "The small one. Same barrel geometry scaled down to fit a cup holder, a side pocket and most espresso machines, carrying a stripped-back black design with a single brass rule at the base.",
    price: 1290,
    capacityMl: 350,
    print: "Full-wrap, matte",
    images: [],
    tone: "#8a8275",
    accent: "#c9a86a",
    palette: ["#131110", "#3a332a", "#c9a86a"],
    traits: ["minimal", "commute", "dark", "small", "mono"],
  },
  {
    slug: "clay-commute",
    name: "Clay Commute",
    tagline: "350 ml, warm clay, cup-holder ready",
    description:
      "The compact barrel carrying a soft clay gradient that runs darker toward the base. Sized around a car cup holder and a crowded metro grip, with the same press-fit lid as the rest of the range.",
    price: 1290,
    capacityMl: 350,
    print: "Full-wrap, matte",
    images: [],
    tone: "#c99a74",
    accent: "#d89a6e",
    palette: ["#8a5a3c", "#c08763", "#f0ddc4"],
    traits: ["warm", "commute", "small", "gift", "earth"],
  },
];

export const featuredProducts = products.filter((p) => p.featured);

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/**
 * Reviews are intentionally empty. Populate only with verified purchases —
 * the Reviews section renders a real empty state until this array fills.
 */
export type Review = {
  id: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  productSlug: string;
  verified: boolean;
  date: string;
};

export const reviews: Review[] = [];

/**
 * Editorial stills that are not tied to one design.
 * Set the filename once the shot exists in `public/products/`.
 */
export const siteImages: { hero?: string; manifesto?: string } = {
  /** Full-bleed opening still. Landscape 16:9, >=2400px wide, dark ground. */
  hero: undefined,
  /** Wide still behind the manifesto. Landscape 21:9 crops well. */
  manifesto: undefined,
};
