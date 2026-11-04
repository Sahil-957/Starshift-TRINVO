/** Shop details and checkout settings. Callers check access first. */
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, withShop } from "../db/index.ts";
import { auditLogs, shopSettings, shops } from "../db/schema.ts";
import { STATES } from "../lib/india.ts";

export const getShop = async (shopId: string) => (await db.select().from(shops).where(eq(shops.id, shopId)))[0];

export const shopDetailsInput = z.object({
  name: z.string().trim().min(1).max(80),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, "That doesn't look like a GSTIN")
    .or(z.literal(""))
    .transform((v) => v || null),
  originState: z
    .string()
    .refine((v) => v === "" || v in STATES, "Pick a state")
    .transform((v) => v || null),
  orderPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "2–5 letters, e.g. TNV"),
  primaryDomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/, "A domain like tinvo.in")
    .or(z.literal(""))
    .transform((v) => v || null),
});

export async function updateShopDetails(userId: string, shopId: string, input: z.input<typeof shopDetailsInput>) {
  const data = shopDetailsInput.parse(input);
  const before = await getShop(shopId);
  await db.transaction(async (tx) => {
    await tx.update(shops).set(data).where(eq(shops.id, shopId));
    await tx.insert(auditLogs).values({
      orgId: before.orgId,
      shopId,
      actorUserId: userId,
      action: "shop.update",
      targetType: "shop",
      targetId: shopId,
      before: { name: before.name, gstin: before.gstin, originState: before.originState, orderPrefix: before.orderPrefix },
      after: data,
    });
  });
}

export async function archiveShop(userId: string, shopId: string) {
  const shop = await getShop(shopId);
  await db.transaction(async (tx) => {
    await tx.update(shops).set({ archivedAt: sql`now()` }).where(eq(shops.id, shopId));
    await tx.insert(auditLogs).values({
      orgId: shop.orgId,
      shopId,
      actorUserId: userId,
      action: "shop.archive",
      targetType: "shop",
      targetId: shopId,
    });
  });
}

// ─── checkout settings (shop_settings rows) ────────────────────────────────

export type CheckoutSettings = {
  shippingFlatMinor: number;
  freeShippingOverMinor: number | null;
  /** Vercel deploy hook that rebuilds the storefront after catalogue edits */
  storefrontDeployHook: string | null;
};

const defaults: CheckoutSettings = { shippingFlatMinor: 0, freeShippingOverMinor: null, storefrontDeployHook: null };
const keys = Object.keys(defaults) as (keyof CheckoutSettings)[];

export async function getCheckoutSettings(shopId: string): Promise<CheckoutSettings> {
  const rows = await withShop(shopId, (tx) =>
    tx
      .select()
      .from(shopSettings)
      .where(and(eq(shopSettings.shopId, shopId), inArray(shopSettings.key, keys))),
  );
  return { ...defaults, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export const checkoutSettingsInput = z.object({
  shippingFlatMinor: z.number().int().min(0).max(1_000_000),
  freeShippingOverMinor: z.number().int().min(0).nullable(),
  storefrontDeployHook: z.url().startsWith("https://").nullable(),
});

export async function setCheckoutSettings(shopId: string, input: CheckoutSettings) {
  const data = checkoutSettingsInput.parse(input);
  await withShop(shopId, async (tx) => {
    for (const key of keys) {
      // explicit jsonb so null is stored as JSON null, not SQL NULL
      const value = sql`${JSON.stringify(data[key])}::jsonb`;
      await tx
        .insert(shopSettings)
        .values({ shopId, key, value })
        .onConflictDoUpdate({
          target: [shopSettings.shopId, shopSettings.key],
          set: { value, updatedAt: sql`now()` },
        });
    }
  });
}
