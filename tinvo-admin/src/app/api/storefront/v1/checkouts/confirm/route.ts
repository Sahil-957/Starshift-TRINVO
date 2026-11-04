import { z } from "zod";
import { confirmPayment } from "@/core/orders";
import { storefront } from "../../handler";

const body = z.object({
  razorpayOrderId: z.string().min(1).max(64),
  razorpayPaymentId: z.string().min(1).max(64),
  razorpaySignature: z.string().regex(/^[0-9a-f]{64}$/),
});

/** Razorpay checkout's success callback, forwarded by the storefront. */
export const POST = storefront(async (shopId, req) => confirmPayment(shopId, body.parse(await req.json())));
