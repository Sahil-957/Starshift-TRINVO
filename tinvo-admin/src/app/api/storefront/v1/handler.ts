import { ZodError } from "zod";
import { shopForToken } from "@/core/apikeys";
import { CheckoutError } from "@/core/orders";

/**
 * Storefront API wrapper (proposal §5.1). Server-to-server only: the token lives
 * in the storefront's server env, and no CORS headers are sent, so browsers
 * cannot call this directly. The token alone decides the shop.
 */
export function storefront(fn: (shopId: string, req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    const shopId = await shopForToken(req.headers.get("authorization"));
    if (!shopId) return Response.json({ error: "Invalid storefront token" }, { status: 401 });
    try {
      return Response.json(await fn(shopId, req));
    } catch (e) {
      if (e instanceof ZodError) return Response.json({ error: e.issues[0].message, issues: e.issues }, { status: 400 });
      if (e instanceof CheckoutError) return Response.json({ error: e.message }, { status: 400 });
      if (e instanceof Error && e.message.startsWith("PayU")) {
        console.error("storefront api: payment provider", e.message);
        return Response.json({ error: "Payments are temporarily unavailable. Please try again shortly." }, { status: 502 });
      }
      console.error("storefront api", e);
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
