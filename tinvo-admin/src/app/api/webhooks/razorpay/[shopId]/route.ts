import { z } from "zod";
import { handleRazorpayWebhook } from "@/core/orders";

/**
 * Razorpay webhook, one URL per shop: /api/webhooks/razorpay/<shop id>.
 * Set it in Razorpay → Webhooks with events payment.captured and order.paid,
 * and the same secret as Settings → Integrations. The signature is checked
 * against that shop's secret, so a request for the wrong shop simply fails.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/webhooks/razorpay/[shopId]">) {
  const { shopId } = await ctx.params;
  if (!z.uuid().safeParse(shopId).success) return new Response("Not found", { status: 404 });
  const raw = await req.text();
  const result = await handleRazorpayWebhook(
    shopId,
    raw,
    req.headers.get("x-razorpay-signature") ?? "",
    req.headers.get("x-razorpay-event-id") ?? `sig:${req.headers.get("x-razorpay-signature")}`,
  );
  return result === "invalid" ? new Response("Invalid signature", { status: 400 }) : Response.json({ result });
}
