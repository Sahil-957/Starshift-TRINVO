import { adminFetch, checkoutEnabled, siteOrigin } from "@/lib/admin-api";

/**
 * PayU posts the customer's browser here after paying (or failing). The admin
 * checks PayU's signature and the amount; we only send the customer on.
 */
export async function POST(req: Request) {
  if (!checkoutEnabled) return new Response("Checkout isn't open yet.", { status: 503 });
  const fields = Object.fromEntries([...(await req.formData()).entries()].map(([k, v]) => [k, String(v)]));
  const res = await adminFetch("/checkouts/payu-return", { method: "POST", body: JSON.stringify(fields) });
  const data = await res.json().catch(() => ({}));
  const to = new URL("/order", siteOrigin(req));
  if (res.ok) {
    to.searchParams.set("number", data.number);
    to.searchParams.set("email", data.email);
    to.searchParams.set(data.paid ? "placed" : "failed", "1");
  } else {
    to.pathname = "/checkout";
    to.searchParams.set("error", data.error ?? "We couldn't confirm your payment.");
  }
  // 303: the browser follows with a GET, not a re-POST
  return Response.redirect(to, 303);
}
