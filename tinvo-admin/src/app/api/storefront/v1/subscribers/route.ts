import { subscribe } from "@/core/subscribers";
import { storefront } from "../handler";

/** Drop-list sign-up: { email } */
export const POST = storefront(async (shopId, req) => subscribe(shopId, (await req.json()).email));
