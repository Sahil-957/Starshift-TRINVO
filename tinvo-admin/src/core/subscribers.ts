/** The storefront's drop list: emails that asked to hear about new designs first. */
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { withShop } from "../db/index.ts";
import { subscribers } from "../db/schema.ts";

const email = z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address."));

/** Idempotent: signing up twice is not an error. */
export async function subscribe(shopId: string, raw: unknown) {
  const value = email.parse(raw);
  await withShop(shopId, (tx) => tx.insert(subscribers).values({ shopId, email: value }).onConflictDoNothing());
  return { ok: true };
}

export const listSubscribers = (shopId: string) =>
  withShop(shopId, (tx) =>
    tx.select().from(subscribers).where(eq(subscribers.shopId, shopId)).orderBy(desc(subscribers.createdAt)).limit(5000),
  );

export const unsubscribe = (shopId: string, id: string) =>
  withShop(shopId, (tx) => tx.delete(subscribers).where(and(eq(subscribers.shopId, shopId), eq(subscribers.id, id))));

export const subscriberCount = (shopId: string) =>
  withShop(shopId, async (tx) => (await tx.select({ n: sql<number>`count(*)::int` }).from(subscribers).where(eq(subscribers.shopId, shopId)))[0].n);
