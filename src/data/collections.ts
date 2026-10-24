/**
 * Catalogue structure. Collections are derived from the `traits` each product
 * already carries rather than a second list that has to be kept in sync —
 * add a trait to a product and it joins the right collections automatically.
 *
 * There is no size axis: the supplier makes one 20 oz barrel.
 *
 * Keep every collection holding at least two products, or it reads as a
 * dead end on the shop page.
 */

import { products, type Product } from "./products";

export type Collection = {
  slug: string;
  /** Short label for nav and filter chips */
  label: string;
  title: string;
  lede: string;
  /** Which axis this collection sorts on, used to group the filter bar */
  group: "Character" | "Use";
  accent: string;
  /** A product belongs here when this returns true */
  match: (product: Product) => boolean;
};

const hasTrait = (trait: string) => (product: Product) =>
  product.traits.includes(trait);

export const collections: Collection[] = [
  {
    slug: "minimal",
    label: "Minimal",
    title: "Quiet designs",
    lede: "Artwork that stops announcing itself by the second week. Flat fields, restrained palettes, nothing that fights the desk it sits on.",
    group: "Character",
    accent: "var(--color-bronze)",
    match: hasTrait("minimal"),
  },
  {
    slug: "bold",
    label: "Bold",
    title: "Loud designs",
    lede: "The pieces that behave like a poster. Full-spectrum colour, hard contrast, meant to be the brightest object on the table.",
    group: "Character",
    accent: "var(--color-rose)",
    match: hasTrait("bold"),
  },
  {
    slug: "for-the-desk",
    label: "For the desk",
    title: "Desk pieces",
    lede: "Designs drawn to be looked at all day at close range, on a barrel narrow enough to clear a keyboard tray.",
    group: "Use",
    accent: "var(--color-plum)",
    match: hasTrait("desk"),
  },
  {
    slug: "on-the-move",
    label: "On the move",
    title: "Commute and travel",
    lede: "For a bag, a car holder and a crowded metro grip — the sizes and finishes that survive being carried around every day.",
    group: "Use",
    accent: "var(--color-cobalt)",
    match: (p) => hasTrait("commute")(p) || hasTrait("travel")(p),
  },
  {
    slug: "gifts",
    label: "Gifts",
    title: "Worth giving",
    lede: "The designs people pick for someone else: finished pieces that arrive as an object the recipient did not have to choose.",
    group: "Use",
    accent: "var(--color-jade)",
    match: hasTrait("gift"),
  },
];

export const getCollection = (slug: string) =>
  collections.find((c) => c.slug === slug);

export const collectionProducts = (collection: Collection) =>
  products.filter(collection.match);

/** Collections grouped by axis, for the shop filter bar and the index page. */
export const collectionGroups = ["Character", "Use"].map((group) => ({
  group,
  items: collections.filter((c) => c.group === group),
}));
