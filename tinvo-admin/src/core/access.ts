/**
 * Who may reach which shop (proposal §3.1, layer 2 of §2.4).
 * Organisation owners/admins reach every shop in their organisation; managers
 * and staff reach only shops they are members of. Every protected page and
 * action calls assertCanAccess with the shop id from the request, so editing a
 * URL or form field to another shop's id gets "not found", never its data.
 */
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.ts";
import { organisationMembers, shopMembers, shops } from "../db/schema.ts";

export type Role = "owner" | "admin" | "manager" | "staff";
export type Action = "view" | "manage";

export class AccessDenied extends Error {
  constructor() {
    super("Shop not found");
  }
}

const uuid = z.uuid();

/** The user's role in a shop, or null. Archived shops are unreachable. */
export async function shopRoleFor(userId: string, shopId: string): Promise<Role | null> {
  if (!uuid.safeParse(shopId).success || !uuid.safeParse(userId).success) return null;
  const [row] = await db
    .select({ orgRole: organisationMembers.role, shopRole: shopMembers.role })
    .from(shops)
    .leftJoin(
      organisationMembers,
      and(eq(organisationMembers.orgId, shops.orgId), eq(organisationMembers.userId, userId)),
    )
    .leftJoin(shopMembers, and(eq(shopMembers.shopId, shops.id), eq(shopMembers.userId, userId)))
    .where(and(eq(shops.id, shopId), isNull(shops.archivedAt)));
  return row?.orgRole ?? row?.shopRole ?? null;
}

/** Throws AccessDenied unless the user may perform `action` in the shop. */
export async function assertCanAccess(userId: string, shopId: string, action: Action): Promise<Role> {
  const role = await shopRoleFor(userId, shopId);
  if (!role || (action === "manage" && role === "staff")) throw new AccessDenied();
  return role;
}

/** Shops the user can open, for the switcher and the organisation dashboard. */
export function shopsFor(userId: string) {
  return db
    .selectDistinct({
      id: shops.id,
      name: shops.name,
      slug: shops.slug,
      orgId: shops.orgId,
      currency: shops.settlementCurrency,
    })
    .from(shops)
    .leftJoin(
      organisationMembers,
      and(eq(organisationMembers.orgId, shops.orgId), eq(organisationMembers.userId, userId)),
    )
    .leftJoin(shopMembers, and(eq(shopMembers.shopId, shops.id), eq(shopMembers.userId, userId)))
    .where(
      and(
        isNull(shops.archivedAt),
        or(eq(organisationMembers.userId, userId), eq(shopMembers.userId, userId)),
      ),
    )
    .orderBy(shops.name);
}

/** Organisations where the user is an owner or admin (may create shops). */
export function orgsManagedBy(userId: string) {
  return db
    .select({ orgId: organisationMembers.orgId, role: organisationMembers.role })
    .from(organisationMembers)
    .where(eq(organisationMembers.userId, userId));
}
