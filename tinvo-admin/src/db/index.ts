import { attachDatabasePool } from "@vercel/functions";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

/**
 * The app connects as `tinvo_app`, a role row-level security applies to.
 * Migrations use the owner role (DATABASE_URL_UNPOOLED), which bypasses RLS.
 *
 * Locally the app URL is derived from DATABASE_URL (which `neon checkout` keeps
 * on the current branch) with tinvo_app's credentials swapped in, so switching
 * branch always switches the app too. A deployment may set APP_DATABASE_URL.
 */
function appUrl() {
  if (process.env.APP_DATABASE_URL) return process.env.APP_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  const password = process.env.TINVO_APP_PASSWORD;
  if (!base || !password) return undefined;
  const u = new URL(base);
  u.username = "tinvo_app";
  u.password = password;
  return u.toString();
}

export const pool = new pg.Pool({
  // Neon's string says sslmode=require, which pg treats as verify-full today but
  // will weaken in pg 9; pin full verification so it can't silently change
  connectionString: appUrl()?.replace("sslmode=require", "sslmode=verify-full"),
});

// lets Vercel Fluid compute close idle connections before the instance sleeps
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `fn` in a transaction scoped to one shop. The setting is transaction-local
 * (the pooler is in transaction mode), and RLS policies read it, so a query
 * here cannot see another shop's rows even if its WHERE clause is wrong.
 */
export const withShop = <T>(shopId: string, fn: (tx: Tx) => Promise<T>) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_shop_id', ${shopId}, true)`);
    return fn(tx);
  });
