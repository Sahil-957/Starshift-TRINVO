import { storefrontProducts } from "@/core/catalogue";
import { storefront } from "../handler";

/** Active products with their commerce fields (name, copy, price). */
export const GET = storefront(async (shopId) => ({ products: await storefrontProducts(shopId) }));
