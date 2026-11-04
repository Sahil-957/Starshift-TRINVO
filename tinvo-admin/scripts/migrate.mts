/**
 * Applies drizzle/ migrations as the owner role (DATABASE_URL_UNPOOLED: direct,
 * not pooled, as Neon requires for migrations). Targets whichever Neon branch
 * .env.local points at; `neon checkout <branch>` switches it.
 *
 *   npm run db:migrate
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set (run `neon env pull`)");

const pool = new pg.Pool({ connectionString: url.replace("sslmode=require", "sslmode=verify-full") });
console.log(`Migrating Neon branch ${process.env.NEON_BRANCH ?? "(unknown)"}…`);
await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
console.log("Done.");
await pool.end();
