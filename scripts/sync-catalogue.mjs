/**
 * Runs before every storefront build: pulls the shop's active products and its
 * shipping rule from the admin into src/data/catalogue.json. Without ADMIN_API_URL / STOREFRONT_TOKEN
 * it does nothing, and the storefront's own catalogue is used as is.
 * If the admin is unreachable, the last synced file is kept rather than failing.
 */
import { writeFile } from "node:fs/promises";

const out = new URL("../src/data/catalogue.json", import.meta.url);
const { ADMIN_API_URL: url, STOREFRONT_TOKEN: token } = process.env;

if (!url || !token) {
  console.log("catalogue: admin not configured, using the storefront catalogue");
} else {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/storefront/v1/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
    const { products, shipping } = await res.json();
    const bySlug = Object.fromEntries(products.map(({ slug, ...rest }) => [slug, rest]));
    await writeFile(out, `${JSON.stringify({ syncedAt: new Date().toISOString(), products: bySlug, shipping }, null, 2)}\n`);
    console.log(`catalogue: synced ${products.length} active products from the admin`);
  } catch (e) {
    console.warn(`catalogue: sync failed, keeping the last synced file (${e.message})`);
  }
}
