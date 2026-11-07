import { adminFetch, checkoutEnabled, siteOrigin } from "@/lib/admin-api";

/**
 * Forwards the cart and address to the admin, which prices it and signs a PayU
 * payment request. PayU sends the customer back to our /api/checkout/payu.
 */
export async function POST(req: Request) {
  if (!checkoutEnabled) return Response.json({ error: "Checkout isn't open yet." }, { status: 503 });
  const returnUrl = `${siteOrigin(req)}/api/checkout/payu`;
  const body = { ...(await req.json()), returnUrl };
  const res = await adminFetch("/checkouts", { method: "POST", body: JSON.stringify(body) });
  return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json" } });
}
