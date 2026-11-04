/**
 * Uploads the print-ready wrap files into the shop's private storage, so
 * Qikink gets a time-limited signed link instead of a public GitHub URL.
 *
 *   npm run print-files:upload -- tinvo
 *
 * Files land at shops/<shop id>/print-files/<file name>.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db/index.ts";
import { shops } from "../src/db/schema.ts";
import { putFile, signedUrl } from "../src/lib/storage.ts";

const slug = process.argv[2];
const dir = join(import.meta.dirname, "../../resized/With Logo");
if (!slug) throw new Error("Usage: npm run print-files:upload -- <shop slug>");

const found = await db.select().from(shops).where(eq(shops.slug, slug));
if (found.length !== 1) throw new Error(`Expected one shop with slug "${slug}", found ${found.length}`);
const [shop] = found;

const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".png"));
console.log(`Uploading ${files.length} print files for ${shop.name} (${process.env.NEON_BRANCH})\n`);
for (const file of files) {
  const key = `shops/${shop.id}/print-files/${file}`;
  const body = await readFile(join(dir, file));
  await putFile(key, body, "image/png");
  console.log(`  ok  ${file}  (${(body.length / 1e6).toFixed(1)} MB)`);
}

// prove a signed link works without credentials, as Qikink will use it
// (the signature covers GET only, so probe with GET and drop the body)
const probe = await fetch(await signedUrl(`shops/${shop.id}/print-files/${files[0]}`, 120));
await probe.body?.cancel();
console.log(`\nSigned link check: HTTP ${probe.status} ${probe.headers.get("content-type")}`);
if (!probe.ok) process.exitCode = 1;
await pool.end();
