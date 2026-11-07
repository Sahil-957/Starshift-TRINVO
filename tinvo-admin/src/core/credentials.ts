/** Per-shop integration secrets: written from Settings, read only on the server. */
import { and, eq, sql } from "drizzle-orm";
import { withShop } from "../db/index.ts";
import { shopCredentials } from "../db/schema.ts";
import { decryptJson, encryptJson } from "../lib/crypto.ts";
import type { PayuCreds } from "../lib/payu.ts";
import type { QikinkCreds } from "../lib/qikink.ts";

type Providers = { payu: PayuCreds; qikink: QikinkCreds };
export type Provider = keyof Providers;

export async function getCredentials<P extends Provider>(shopId: string, provider: P): Promise<Providers[P] | null> {
  const [row] = await withShop(shopId, (tx) =>
    tx
      .select()
      .from(shopCredentials)
      .where(and(eq(shopCredentials.shopId, shopId), eq(shopCredentials.provider, provider))),
  );
  return row ? decryptJson<Providers[P]>(row.encrypted) : null;
}

export async function setCredentials<P extends Provider>(shopId: string, provider: P, value: Providers[P]) {
  const encrypted = encryptJson(value);
  await withShop(shopId, (tx) =>
    tx
      .insert(shopCredentials)
      .values({ shopId, provider, encrypted })
      .onConflictDoUpdate({
        target: [shopCredentials.shopId, shopCredentials.provider],
        set: { encrypted, updatedAt: sql`now()` },
      }),
  );
}

/** Which providers are configured, without decrypting anything. */
export const configuredProviders = (shopId: string) =>
  withShop(shopId, (tx) =>
    tx
      .select({ provider: shopCredentials.provider, updatedAt: shopCredentials.updatedAt })
      .from(shopCredentials)
      .where(eq(shopCredentials.shopId, shopId)),
  );
