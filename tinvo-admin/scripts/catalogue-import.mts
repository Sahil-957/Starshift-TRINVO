/**
 * One-off: brings the TINVO storefront's catalogue (src/data/products.ts) into
 * the admin as products of a shop, with Qikink fulfilment details. Products that
 * already exist (by slug) are left alone, so admin edits are never overwritten.
 *
 *   npm run catalogue:import -- tinvo
 *
 * Run `npm run print-files:upload -- tinvo` first so the print files exist.
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db/index.ts";
import { shops } from "../src/db/schema.ts";
import { createProduct, listProducts } from "../src/core/catalogue.ts";

const slug = process.argv[2];
if (!slug) throw new Error("Usage: npm run catalogue:import -- <shop slug>");
const [shop] = await db.select().from(shops).where(eq(shops.slug, slug));
if (!shop) throw new Error(`No shop with slug "${slug}"`);

const storefront = pathToFileURL(join(import.meta.dirname, "../../src/data/products.ts")).href;
const { products } = (await import(storefront)) as {
  products: { slug: string; name: string; tagline: string; description: string; price: number }[];
};

/** Wrap file per design (same mapping as scripts/studio.py). */
const wraps: Record<string, string> = {
  "aurora-gilt": "Golden Foil.png",
  "chroma-tide": "blue foil.png",
  "opal-drift": "Pink Foil.png",
  "midnight-slate": "Navy Blue.png",
  "cloud-theory": "Sky Blue.png",
  "pink-serenity": "Baby Pink.png",
  solara: "Cream.png",
  "mauve-mode": "Purple.png",
  "cocoa-noir": "Voilet.png",
  "olive-dusk": "Brown.png",
};
// public product photo until the storefront has its own domain (Settings → domain)
const mockup = (s: string) =>
  shop.primaryDomain
    ? `https://${shop.primaryDomain}/products/${s}-hero.webp`
    : `https://raw.githubusercontent.com/Sahil-957/Starshift-TRINVO/main/public/products/${s}-hero.webp`;

const existing = new Set((await listProducts(shop.id)).map((p) => p.slug));
console.log(`Importing into ${shop.name} (${process.env.NEON_BRANCH})\n`);
for (const p of products) {
  if (existing.has(p.slug)) {
    console.log(`  skip  ${p.slug} (already in the admin)`);
    continue;
  }
  const wrap = wraps[p.slug];
  await createProduct(shop.id, {
    name: p.name,
    slug: p.slug,
    tagline: p.tagline,
    description: p.description,
    status: "active",
    price: String(p.price),
    compareAt: "",
    cost: "481.44", // Qikink's price for the 20 oz tumbler
    taxRatePercent: "18",
    hsnCode: "",
    supplierSku: "UTumb-Wh-20oz",
    printTypeId: "5", // accepted by the sandbox; confirm the live value with Qikink
    designCode: `tinvo_${p.slug}`.slice(0, 20),
    printFileKey: wrap ? `shops/${shop.id}/print-files/${wrap}` : "",
    printWidthIn: "9.3", // 4650 × 4000 px at 500 dpi
    printHeightIn: "8",
    mockupUrl: mockup(p.slug),
  });
  console.log(`  add   ${p.slug}  ₹${p.price}${wrap ? "" : "  (no print file mapped)"}`);
}
await pool.end();
