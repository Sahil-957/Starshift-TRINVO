import { adminFetch, checkoutEnabled } from "@/lib/admin-api";

/** Forwards Razorpay's success callback; the admin verifies its signature. */
export async function POST(req: Request) {
  if (!checkoutEnabled) return Response.json({ error: "Checkout isn't open yet." }, { status: 503 });
  const res = await adminFetch("/checkouts/confirm", { method: "POST", body: await req.text() });
  return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json" } });
}
