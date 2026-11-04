import { CheckoutError, lookupOrder } from "@/core/orders";
import { storefront } from "../handler";

/** "Track my order": needs both the order number and the email used. */
export const GET = storefront(async (shopId, req) => {
  const q = new URL(req.url).searchParams;
  const order = await lookupOrder(shopId, q.get("number") ?? "", q.get("email") ?? "");
  if (!order) throw new CheckoutError("No order matches that number and email.");
  return { order };
});
