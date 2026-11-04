import { timingSafeEqual } from "node:crypto";
import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";
import { syncShop } from "@/core/orders";

/**
 * Every 30 minutes (vercel.json): pull order status and tracking from Qikink for
 * every shop. Qikink has no webhooks, so polling is the only way. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || got.length !== expected.length || !timingSafeEqual(got, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const list = await db.select({ id: shops.id, name: shops.name }).from(shops).where(isNull(shops.archivedAt));
  const results = [];
  for (const s of list) results.push({ shop: s.name, ...(await syncShop(s.id)) });
  return Response.json({ results });
}
