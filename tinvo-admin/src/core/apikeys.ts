/**
 * Storefront tokens (proposal §5.2): shown once, stored as a SHA-256 hash, and
 * each resolves to exactly one shop, so a storefront can never name another shop.
 */
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { apiKeys, shops } from "../db/schema.ts";
import { sha256 } from "../lib/crypto.ts";

export async function createApiKey(shopId: string, name: string) {
  const token = `sf_${randomBytes(24).toString("base64url")}`;
  await db.insert(apiKeys).values({ shopId, name: name.trim() || "Storefront", prefix: token.slice(0, 7), keyHash: sha256(token) });
  return token;
}

export const listApiKeys = (shopId: string) =>
  db
    .select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, lastUsedAt: apiKeys.lastUsedAt, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(and(eq(apiKeys.shopId, shopId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));

export const revokeApiKey = (shopId: string, keyId: string) =>
  db.update(apiKeys).set({ revokedAt: sql`now()` }).where(and(eq(apiKeys.shopId, shopId), eq(apiKeys.id, keyId)));

/** The shop a bearer token belongs to, or null (revoked, unknown, archived shop). */
export async function shopForToken(authorization: string | null) {
  const token = authorization?.match(/^Bearer (sf_[A-Za-z0-9_-]{20,})$/)?.[1];
  if (!token) return null;
  const [row] = await db
    .select({ keyId: apiKeys.id, shopId: apiKeys.shopId })
    .from(apiKeys)
    .innerJoin(shops, eq(shops.id, apiKeys.shopId))
    .where(and(eq(apiKeys.keyHash, sha256(token)), isNull(apiKeys.revokedAt), isNull(shops.archivedAt)));
  if (!row) return null;
  await db.update(apiKeys).set({ lastUsedAt: sql`now()` }).where(eq(apiKeys.id, row.keyId));
  return row.shopId;
}
