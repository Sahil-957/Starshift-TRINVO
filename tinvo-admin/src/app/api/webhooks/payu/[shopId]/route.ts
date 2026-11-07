import { z } from "zod";
import { handlePayuWebhook } from "@/core/orders";

/**
 * PayU webhook, one URL per shop: /api/webhooks/payu/<shop id>.
 * Add it in PayU → Settings → Webhooks for successful and failed payments.
 * PayU may send form-encoded or JSON; either way the reverse hash is checked
 * against that shop's Salt, so a request for the wrong shop simply fails.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/webhooks/payu/[shopId]">) {
  const { shopId } = await ctx.params;
  if (!z.uuid().safeParse(shopId).success) return new Response("Not found", { status: 404 });
  const type = req.headers.get("content-type") ?? "";
  const fields: Record<string, string> = type.includes("json")
    ? Object.fromEntries(Object.entries(await req.json()).map(([k, v]) => [k, String(v ?? "")]))
    : Object.fromEntries([...(await req.formData()).entries()].map(([k, v]) => [k, String(v)]));
  const result = await handlePayuWebhook(shopId, fields);
  return result === "invalid" ? new Response("Invalid hash", { status: 400 }) : Response.json({ result });
}
