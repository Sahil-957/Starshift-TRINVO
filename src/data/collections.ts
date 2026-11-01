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
    slug: "solid",
    label: "Solid colour",
    title: "Solid colours",
    lede: "One colour, edge to edge, and the TINVO mark. From deep navy and cocoa to cream and powder blue — quiet enough for every day.",
    group: "Character",
    accent: "var(--color-bronze)",
    match: hasTrait("minimal"),
  },
  {
    slug: "liquid-foil",
    label: "Liquid foil",
    title: "Liquid foil",
    lede: "Molten metal and holographic colour printed full-wrap, so the design keeps moving as you turn the tumbler.",
    group: "Character",
    accent: "var(--color-rose)",
    match: hasTrait("bold"),
  },
  {
    slug: "for-the-desk",
    label: "For the desk",
    title: "Desk pieces",
    lede: "Designs that hold up to being looked at all day at close range, on a slim barrel that stays out of the way.",
    group: "Use",
    accent: "var(--color-plum)",
    match: hasTrait("desk"),
  },
  {
    slug: "on-the-move",
    label: "On the move",
    title: "Commute and travel",
    lede: "For a bag, a car holder and a crowded metro grip — colours that hide a scuff and go with everything you carry.",
    group: "Use",
    accent: "var(--color-cobalt)",
    match: (p) => hasTrait("commute")(p) || hasTrait("travel")(p),
  },
  {
    slug: "gifts",
    label: "Gifts",
    title: "Worth giving",
    lede: "Finished designs that arrive ready to give — the recipient does not have to choose anything.",
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
