import { storefrontProducts } from "@/core/catalogue";
import { getCheckoutSettings } from "@/core/settings";
import { storefront } from "../handler";

/** Active products with their commerce fields (name, copy, price), and the shipping rule checkout applies. */
export const GET = storefront(async (shopId) => {
  const s = await getCheckoutSettings(shopId);
  return {
    products: await storefrontProducts(shopId),
    shipping: { flatMinor: s.shippingFlatMinor, freeOverMinor: s.freeShippingOverMinor },
  };
});
