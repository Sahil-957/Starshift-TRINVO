/**
 * Proves the Neon services end to end with the vars in .env.local:
 *   - Postgres: write and read a row (temp table, nothing persists)
 *   - Object Storage: upload a private file, fetch it through a signed link
 *     with no credentials (how Qikink would download a print file), delete it
 *
 *   npm run neon:check
 */
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { pool as db } from "../src/db/index.ts";
import { BUCKET, putFile, s3, signedUrl } from "../src/lib/storage.ts";

let failed = false;
async function step(name: string, run: () => Promise<string>) {
  try {
    console.log(`  ok    ${name}: ${await run()}`);
  } catch (e) {
    failed = true;
    console.log(`  FAIL  ${name}: ${(e as Error).message}`);
  }
}

console.log("Neon check\n");

await step("postgres", async () => {
  const c = await db.connect();
  try {
    await c.query("begin");
    await c.query("create temp table neon_check (note text) on commit drop");
    await c.query("insert into neon_check values ($1)", ["hello"]);
    const { rows } = await c.query("select note, version() as v from neon_check");
    await c.query("commit");
    if (rows[0]?.note !== "hello") throw new Error("row did not round-trip");
    return `wrote and read a row (${String(rows[0].v).split(" on ")[0]})`;
  } finally {
    c.release();
  }
});

await step("object storage", async () => {
  const key = `checks/${Date.now()}.txt`;
  const body = `neon check ${new Date().toISOString()}`;
  await putFile(key, body, "text/plain");
  try {
    const url = await signedUrl(key, 60);
    const res = await fetch(url); // no credentials: only the signature
    const text = await res.text();
    if (!res.ok || text !== body) throw new Error(`signed link returned ${res.status}`);
    const anon = await fetch(url.split("?")[0]);
    if (anon.ok) throw new Error("bucket served the file without a signature");
    return `uploaded to "${BUCKET}", read back via a 60s signed link, unsigned access refused (${anon.status})`;
  } finally {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  }
});

await db.end();
console.log(failed ? "\nSome checks failed." : "\nAll checks passed.");
process.exitCode = failed ? 1 : 0;
