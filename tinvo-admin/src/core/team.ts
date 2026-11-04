/**
 * Shop members. Organisation owners/admins already reach every shop; this adds
 * managers (can change things) and staff (view only) to individual shops.
 */
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.ts";
import { auditLogs, organisationMembers, shopMembers, shops, users } from "../db/schema.ts";
import { findUserByEmail, passwordRule } from "./users.ts";

export async function listTeam(shopId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  const [orgPeople, shopPeople] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: organisationMembers.role })
      .from(organisationMembers)
      .innerJoin(users, eq(users.id, organisationMembers.userId))
      .where(eq(organisationMembers.orgId, shop.orgId)),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: shopMembers.role })
      .from(shopMembers)
      .innerJoin(users, eq(users.id, shopMembers.userId))
      .where(eq(shopMembers.shopId, shopId)),
  ]);
  return { orgPeople, shopPeople };
}

export const memberInput = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  name: z.string().trim().max(80),
  role: z.enum(["manager", "staff"]),
  /** only used when the email has no account yet */
  password: z.string(),
});

/** Adds a person to the shop, creating their account with the given password if new. */
export async function addMember(actorId: string, shopId: string, input: z.input<typeof memberInput>) {
  const data = memberInput.parse(input);
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  let user = await findUserByEmail(data.email);
  const created = !user;
  return db.transaction(async (tx) => {
    if (!user) {
      if (!data.name) throw new Error("Name is required for a new account");
      const passwordHash = await bcrypt.hash(passwordRule.parse(data.password), 12);
      [user] = await tx.insert(users).values({ email: data.email, name: data.name, passwordHash }).returning();
    }
    await tx
      .insert(shopMembers)
      .values({ shopId, userId: user.id, role: data.role })
      .onConflictDoUpdate({ target: [shopMembers.shopId, shopMembers.userId], set: { role: data.role } });
    await tx.insert(auditLogs).values({
      orgId: shop.orgId,
      shopId,
      actorUserId: actorId,
      action: "member.add",
      targetType: "user",
      targetId: user.id,
      after: { email: data.email, role: data.role, newAccount: created },
    });
    return { created };
  });
}

export async function removeMember(actorId: string, shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  await db.transaction(async (tx) => {
    await tx.delete(shopMembers).where(and(eq(shopMembers.shopId, shopId), eq(shopMembers.userId, userId)));
    await tx.insert(auditLogs).values({
      orgId: shop.orgId,
      shopId,
      actorUserId: actorId,
      action: "member.remove",
      targetType: "user",
      targetId: userId,
    });
  });
}
