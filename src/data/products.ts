/**
 * Central catalogue for the TINVO storefront.
 *
 * Each entry is one design live on Qikink, printed on the same barrel.
 * Three are liquid-foil prints; seven are solid colours with the mark.
 *
 * IMAGES: `-hero`, `-detail` and the 24 turntable frames in `spin/` are
 * ray-traced studio renders made from the print-ready wrap files by
 * `scripts/studio.py` (Blender). `-lifestyle` is Qikink's own mockup.
 * Re-run the script after changing any wrap file.
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

/**
 * The one barrel every design is printed on: Qikink's Tumbler Bottle.
 * Source: https://qikink.com/custom/drinkware/tumbler-bottle/
 *
 * There is a single size. Qikink states 20 oz and does not publish a ml
 * figure, dimensions or care instructions — 591 ml is the conversion, and
 * anything not listed here is not yet confirmed by the supplier.
 */
export const barrel = {
  capacity: "20 oz",
  capacityMl: 591,
  material: "304 stainless, double-wall vacuum insulated",
  lid: "Splash-proof lid with a reusable metal straw",
  print: "Sublimation, OEKO-TEX certified inks",
} as const;

/** The things most tumbler listings leave out, and most returns come from. */
export const goodToKnow = [
  ["Splash-proof, not leak-proof", "The lid stops sloshes while you walk. Keep it upright in a bag: no straw-lid tumbler is sealed for travelling on its side."],
  ["Hand wash only", "No dishwasher. Heat and detergent wear the print, so warm water and a soft sponge keep it looking new."],
  ["Never microwave or freeze it", "It is a steel vacuum vessel: a microwave makes it arc and freezing can break the vacuum seal."],
  ["Printed for you", "Each tumbler is printed after you order, not pulled from a warehouse shelf."],
];

export type Product = {
  slug: string;
  name: string;
  /** One line under the name on cards */
  tagline: string;
  /** Editorial paragraph for the product page */
  description: string;
  price: number;
  /** Shots for this product; the first is the lead image */
  images: ProductImage[];
  /** Tints the key light behind the product so each frame is lit differently */
  tone: string;
  /** Drives this design's UI colour: index, swatches, hover bar, chips */
  accent: string;
  /** Liquid-foil print or a solid colour with the mark */
  finish: "Liquid foil" | "Solid colour";
  /** Who makes and ships it — keys into `data/policy.ts`. Defaults to Qikink. */
  fulfilment?: string;
  /** Three colours pulled from the artwork, shown as swatches on the card */
  palette: [string, string, string];
  /** Quiz tags — see lib/quiz.ts */
  traits: string[];
  featured?: boolean;
};

/** Studio front, lid-and-straw close-up, then Qikink's lifestyle mockup. */
const shots = (slug: string, name: string): ProductImage[] => [
  { file: `${slug}-hero.webp`, alt: `${name} TINVO tumbler, front`, kind: "main" },
  { file: `${slug}-detail.webp`, alt: `${name} tumbler: splash-proof lid and metal straw`, kind: "detail" },
  { file: `${slug}-lifestyle.webp`, alt: `${name} TINVO tumbler on a table`, kind: "lifestyle" },
];

export const products: Product[] = [
  {
    slug: "aurora-gilt",
    name: "Aurora Gilt",
    tagline: "Liquid gold through an oil-slick spectrum",
    description:
      "Molten gold folding into violet, teal and ice blue, printed edge to edge so the colour keeps moving as you turn it. The richest design in the range.",
    price: 1490,
    finish: "Liquid foil",
    images: shots("aurora-gilt", "Aurora Gilt"),
    tone: "#c9a24a",
    accent: "#d4ad5a",
    palette: ["#b8892f", "#7c6ad6", "#5fc4d8"],
    traits: ["bold", "gift", "desk", "warm"],
    featured: true,
  },
  {
    slug: "chroma-tide",
    name: "Chroma Tide",
    tagline: "Polished chrome with a cool iridescent edge",
    description:
      "Waves of liquid silver with a cyan and lilac sheen running through the folds. Reads like brushed metal from across a room and like a hologram up close.",
    price: 1490,
    finish: "Liquid foil",
    images: shots("chroma-tide", "Chroma Tide"),
    tone: "#a9c4d8",
    accent: "#9fc6dd",
    palette: ["#5d6b80", "#c7d3de", "#7fd6e6"],
    traits: ["bold", "desk", "travel", "cool"],
    featured: true,
  },
  {
    slug: "opal-drift",
    name: "Opal Drift",
    tagline: "Pastel opal in pink, lilac and sky",
    description:
      "A soft holographic swirl of candy pink, lilac and pale blue. Bright without being loud, and an easy one to give.",
    price: 1490,
    finish: "Liquid foil",
    images: shots("opal-drift", "Opal Drift"),
    tone: "#d9a6e8",
    accent: "#e2a3dc",
    palette: ["#e79bd0", "#b9a6f0", "#9fd6f2"],
    traits: ["bold", "gift", "light", "cool"],
    featured: true,
  },
  {
    slug: "midnight-slate",
    name: "Midnight Slate",
    tagline: "Deep navy with a white mark",
    description:
      "A deep slate navy, broken only by the TINVO mark in white. Dark enough to hide a long day of use and quiet enough for any desk or meeting room.",
    price: 1490,
    finish: "Solid colour",
    images: shots("midnight-slate", "Midnight Slate"),
    tone: "#7d8fb3",
    accent: "#8fa3cc",
    palette: ["#262f40", "#3d4a62", "#c9ced6"],
    traits: ["minimal", "dark", "mono", "cool", "commute", "desk"],
    featured: true,
  },
  {
    slug: "cloud-theory",
    name: "Cloud Theory",
    tagline: "Powder blue, calm and cool",
    description:
      "A soft powder blue with the mark in black. Light and airy, the colour of a clear morning, and easy to live with every day.",
    price: 1490,
    finish: "Solid colour",
    images: shots("cloud-theory", "Cloud Theory"),
    tone: "#9cb8d4",
    accent: "#a9c3de",
    palette: ["#9cb8d4", "#c3d5e6", "#1a1a1a"],
    traits: ["minimal", "light", "cool", "travel", "commute"],
  },
  {
    slug: "pink-serenity",
    name: "Pink Serenity",
    tagline: "Dusty pastel pink",
    description:
      "A muted, dusty pink with the mark in white. Warm without being sugary.",
    price: 1490,
    finish: "Solid colour",
    images: shots("pink-serenity", "Pink Serenity"),
    tone: "#da9191",
    accent: "#e5a3a3",
    palette: ["#da9191", "#efc2c0", "#f2f1ee"],
    traits: ["minimal", "light", "warm", "gift"],
    featured: true,
  },
  {
    slug: "solara",
    name: "Solara",
    tagline: "Sunlit cream with a black mark",
    description:
      "A warm buttery cream with the mark in black. The lightest design in the range, at home next to linen, paper and light wood.",
    price: 1490,
    finish: "Solid colour",
    images: shots("solara", "Solara"),
    tone: "#f0dfa8",
    accent: "#ecd89a",
    palette: ["#faefc5", "#e9d9a2", "#1a1a1a"],
    traits: ["minimal", "light", "warm", "earth", "desk", "gift"],
    featured: true,
  },
  {
    slug: "mauve-mode",
    name: "Mauve Mode",
    tagline: "Muted plum, grown-up and warm",
    description:
      "A dusky mauve that sits between plum and rosewood, with the mark in white. Rich in colour without asking for attention.",
    price: 1490,
    finish: "Solid colour",
    images: shots("mauve-mode", "Mauve Mode"),
    tone: "#a07a8c",
    accent: "#c08ca3",
    palette: ["#664454", "#8a6474", "#e8e4e6"],
    traits: ["minimal", "dark", "warm", "gift", "desk"],
  },
  {
    slug: "cocoa-noir",
    name: "Cocoa Noir",
    tagline: "Dark chocolate, nearly black",
    description:
      "A deep cocoa brown that reads almost black until the light hits it, with the mark in white. Our darkest and most understated design.",
    price: 1490,
    finish: "Solid colour",
    images: shots("cocoa-noir", "Cocoa Noir"),
    tone: "#9c7a6e",
    accent: "#c49a86",
    palette: ["#3f2c30", "#5c4247", "#e8e4e6"],
    traits: ["minimal", "dark", "earth", "warm", "mono", "commute"],
  },
  {
    slug: "olive-dusk",
    name: "Olive Dusk",
    tagline: "Earthy olive with a white mark",
    description:
      "A muted olive drab with the mark in white. Field-gear colour that looks at home in a backpack pocket as much as on a desk.",
    price: 1490,
    finish: "Solid colour",
    images: shots("olive-dusk", "Olive Dusk"),
    tone: "#a59a72",
    accent: "#b3a77a",
    palette: ["#776d4a", "#9a9070", "#e8e4e6"],
    traits: ["minimal", "earth", "outdoors", "travel"],
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

/** Editorial stills not tied to one design, in `public/products/`. */
export const siteImages: { manifesto?: string } = {
  /** Every design on one sweep, 21:9 */
  manifesto: "lineup.webp",
};
