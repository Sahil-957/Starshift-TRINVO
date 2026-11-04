/**
 * Razorpay REST, without the SDK: orders, signature checks and refunds.
 * Docs: https://razorpay.com/docs/api/  (test-mode keys start rzp_test_)
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpayCreds = { keyId: string; keySecret: string; webhookSecret: string };

async function call<T>(c: RazorpayCreds, path: string, body: unknown): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${c.keyId}:${c.keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${path} failed (${res.status}): ${data?.error?.description ?? JSON.stringify(data)}`);
  return data as T;
}

/** amount in minor units (paise); receipt is our order number. */
export const createOrder = (c: RazorpayCreds, amount: number, currency: string, receipt: string) =>
  call<{ id: string; amount: number; currency: string; status: string }>(c, "/orders", { amount, currency, receipt });

export const refundPayment = (c: RazorpayCreds, paymentId: string, amount: number) =>
  call<{ id: string; status: string; amount: number }>(c, `/payments/${paymentId}/refund`, { amount });

const safeEqualHex = (a: string, b: string) => {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

/** Checkout callback: HMAC_SHA256(order_id|payment_id, key secret). */
export const verifyPayment = (c: RazorpayCreds, orderId: string, paymentId: string, signature: string) =>
  safeEqualHex(createHmac("sha256", c.keySecret).update(`${orderId}|${paymentId}`).digest("hex"), signature);

/** Webhook: HMAC_SHA256(raw body, webhook secret) in X-Razorpay-Signature. */
export const verifyWebhook = (c: RazorpayCreds, rawBody: string, signature: string) =>
  safeEqualHex(createHmac("sha256", c.webhookSecret).update(rawBody).digest("hex"), signature);
