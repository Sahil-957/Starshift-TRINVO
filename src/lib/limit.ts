/**
 * Per-visitor request limits for the public forms, so a script can't flood
 * checkouts, reviews or the drop list.
 * ponytail: in memory, fine for the single-server deploy; move to Redis if the storefront ever runs on several instances.
 */
const buckets = new Map<string, number[]>();

/** Caddy sets X-Forwarded-For to the real client address (and ignores what the client sent). */
const ip = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** A 429 response when this visitor has made `max` requests to `name` within `windowMs`, else null. */
export function tooMany(req: Request, name: string, max: number, windowMs = 10 * 60_000) {
  const key = `${name}:${ip(req)}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    return Response.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }
  buckets.set(key, [...recent, now]);
  if (buckets.size > 10_000) buckets.clear(); // bound memory under a flood
  return null;
}
