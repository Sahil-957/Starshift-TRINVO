import { tooMany } from "@/lib/limit";
import { adminFetch, checkoutEnabled } from "@/lib/admin-api";

const none = { count: 0, average: null, breakdown: {}, reviews: [] };

/** Published reviews for ?product=<slug> (or the latest across the shop); the admin decides what is published. */
export async function GET(req: Request) {
  if (!checkoutEnabled) return Response.json(none);
  const slug = new URL(req.url).searchParams.get("product") ?? "";
  const res = await adminFetch(slug ? `/reviews?product=${encodeURIComponent(slug)}` : "/reviews");
  return res.ok ? Response.json(await res.json()) : Response.json(none);
}

/** A buyer's review; the admin checks the order and holds it for approval. */
export async function POST(req: Request) {
  if (!checkoutEnabled) return Response.json({ error: "Reviews open with checkout." }, { status: 503 });
  const limited = tooMany(req, "review", 8);
  if (limited) return limited;
  const res = await adminFetch("/reviews", { method: "POST", body: await req.text() });
  return Response.json(await res.json().catch(() => ({})), { status: res.status });
}
