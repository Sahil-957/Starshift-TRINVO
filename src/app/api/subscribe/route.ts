import { tooMany } from "@/lib/limit";
import { adminFetch, checkoutEnabled } from "@/lib/admin-api";

/** Drop-list sign-up, stored in the admin (Drop list tab). */
export async function POST(req: Request) {
  if (!checkoutEnabled) return Response.json({ error: "Sign-ups aren't open yet." }, { status: 503 });
  const limited = tooMany(req, "subscribe", 5);
  if (limited) return limited;
  const { email } = await req.json().catch(() => ({}));
  const res = await adminFetch("/subscribers", { method: "POST", body: JSON.stringify({ email }) });
  return Response.json(await res.json().catch(() => ({})), { status: res.status });
}
