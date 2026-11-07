import { timingSafeEqual } from "node:crypto";
import { writeFile } from "node:fs/promises";

/**
 * "Publish to storefront" from the admin lands here (the shop's deploy hook:
 * https://<site>/api/publish?key=<PUBLISH_KEY>). It only drops a trigger file;
 * the server's deploy job (deploy/systemd/tinvo-publish.path) sees it and
 * rebuilds the site in a fresh folder, so the live site never breaks mid-build.
 */
export async function POST(req: Request) {
  const expected = process.env.PUBLISH_KEY;
  const trigger = process.env.PUBLISH_TRIGGER;
  if (!expected || !trigger) return new Response("Not found", { status: 404 });
  const got = new URL(req.url).searchParams.get("key") ?? "";
  if (got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  await writeFile(trigger, new Date().toISOString());
  return Response.json({ ok: true, message: "Rebuild queued" }, { status: 202 });
}
