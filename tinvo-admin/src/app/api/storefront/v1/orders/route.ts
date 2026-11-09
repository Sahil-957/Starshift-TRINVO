import { CheckoutError, lookupOrder } from "@/core/orders";
import { z } from "zod";
import { emailOrderList } from "@/core/notify";
import { storefront } from "../handler";

/** "Track my order": needs both the order number and the email used. */
export const GET = storefront(async (shopId, req) => {
  const q = new URL(req.url).searchParams;
  const order = await lookupOrder(shopId, q.get("number") ?? "", q.get("email") ?? "");
  if (!order) throw new CheckoutError("No order matches that number and email.");
  return { order };
});

/** "Email me my orders": { email }. Always answers the same, so it never reveals who has ordered. */
export const POST = storefront(async (shopId, req) => {
  const email = z.string().trim().max(200).pipe(z.email("Enter a valid email.")).parse((await req.json()).email);
  await emailOrderList(shopId, email).catch((e) => console.error("email (order list) failed:", (e as Error).message));
  return { ok: true };
});
