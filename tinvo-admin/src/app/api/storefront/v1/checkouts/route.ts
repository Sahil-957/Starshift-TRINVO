import { createCheckout } from "@/core/orders";
import { storefront } from "../handler";

/** Cart + customer + address + return URL -> priced order and a signed PayU payment form. */
export const POST = storefront(async (shopId, req) => {
  const body = await req.json();
  return createCheckout(shopId, body, body.returnUrl);
});
