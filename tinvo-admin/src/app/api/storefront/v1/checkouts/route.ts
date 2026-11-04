import { createCheckout } from "@/core/orders";
import { storefront } from "../handler";

/** Cart + customer + address -> priced order and a Razorpay order to pay. */
export const POST = storefront(async (shopId, req) => createCheckout(shopId, await req.json()));
