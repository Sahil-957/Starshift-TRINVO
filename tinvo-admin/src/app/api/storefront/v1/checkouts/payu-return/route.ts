import { z } from "zod";
import { payuReturn } from "@/core/orders";
import { storefront } from "../../handler";

/** PayU's post-back (surl/furl), forwarded by the storefront. The signature is checked here. */
export const POST = storefront(async (shopId, req) =>
  payuReturn(shopId, z.record(z.string(), z.string()).parse(await req.json())),
);
