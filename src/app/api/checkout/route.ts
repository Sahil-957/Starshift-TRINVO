import { adminFetch, checkoutEnabled } from "@/lib/admin-api";

/** Forwards the cart and address to the admin, which prices it and opens a Razorpay order. */
export async function POST(req: Request) {
  if (!checkoutEnabled) return Response.json({ error: "Checkout isn't open yet." }, { status: 503 });
  const res = await adminFetch("/checkouts", { method: "POST", body: await req.text() });
  return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json" } });
}
