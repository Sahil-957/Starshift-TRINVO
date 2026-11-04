/**
 * Creating a shop. TINVO and every later brand go through this same function,
 * from the admin UI; there is no seeded special case (proposal §5.2).
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.ts";
import { auditLogs, organisationMembers, shops } from "../db/schema.ts";
import { AccessDenied } from "./access.ts";

export const shopInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens")
    .max(40),
  settlementCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. INR"),
});
export type ShopInput = z.infer<typeof shopInput>;

export async function createShop(userId: string, orgId: string, input: ShopInput) {
  const data = shopInput.parse(input);
  return db.transaction(async (tx) => {
    const [member] = await tx
      .select({ role: organisationMembers.role })
      .from(organisationMembers)
      .where(and(eq(organisationMembers.orgId, orgId), eq(organisationMembers.userId, userId)));
    if (!member) throw new AccessDenied();

    const [shop] = await tx
      .insert(shops)
      .values({ orgId, ...data })
      .returning();
    await tx.insert(auditLogs).values({
      orgId,
      shopId: shop.id,
      actorUserId: userId,
      action: "shop.create",
      targetType: "shop",
      targetId: shop.id,
      after: data,
    });
    return shop;
  });
}
