/**
 * The proposal's critical tests (§8) that must stay automated:
 *   2  a second shop needs no schema change
 *   4  a manager cannot reach another shop by editing an id
 *   1  shop data is only visible in its own shop's context (RLS backstop)
 *   7  archiving and deletion never destroy history
 * Runs against the Neon branch in .env.local (use `dev`, never production).
 *
 *   npm test
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { db, pool, withShop } from "../db/index.ts";
import { auditLogs, shopMembers, shopSettings, shops, users } from "../db/schema.ts";
import { AccessDenied, assertCanAccess, shopRoleFor, shopsFor } from "./access.ts";
import { createShop } from "./shops.ts";
import { createOwner, verifyLogin } from "./users.ts";

if (process.env.NEON_BRANCH === "production") throw new Error("Refusing to run tests against production");

const run = Date.now().toString(36);
const password = "correct-horse-battery";
let orgId = "";
let owner = "";
let manager = "";
let staff = "";
let shopA = "";
let shopB = "";

/** Drizzle wraps Postgres errors; match the database's own message. */
const pgError = (pattern: RegExp) => (e: unknown) =>
  pattern.test(String((e as { cause?: Error }).cause?.message ?? (e as Error).message));

before(async () => {
  const o = await createOwner({ email: `owner-${run}@test.invalid`, name: "Owner", password, orgName: `Test ${run}` });
  orgId = o.org.id;
  owner = o.user.id;
  shopA = (await createShop(owner, orgId, { name: "Shop A", slug: `a-${run}`, settlementCurrency: "inr" })).id;
  shopB = (await createShop(owner, orgId, { name: "Shop B", slug: `b-${run}`, settlementCurrency: "USD" })).id;

  const hash = await bcrypt.hash(password, 4);
  const [m, s] = await db
    .insert(users)
    .values([
      { email: `manager-${run}@test.invalid`, name: "Manager", passwordHash: hash },
      { email: `staff-${run}@test.invalid`, name: "Staff", passwordHash: hash },
    ])
    .returning();
  manager = m.id;
  staff = s.id;
  await db.insert(shopMembers).values([
    { shopId: shopA, userId: manager, role: "manager" },
    { shopId: shopA, userId: staff, role: "staff" },
  ]);
});

after(async () => {
  // test rows are removed as the owner role: the app role cannot delete history
  const owner = new pg.Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED!.replace("sslmode=require", "sslmode=verify-full"),
  });
  await owner.connect();
  const ids = [orgId];
  await owner.query("delete from shop_settings where shop_id in (select id from shops where org_id = $1)", ids);
  await owner.query("delete from shop_members where shop_id in (select id from shops where org_id = $1)", ids);
  await owner.query("delete from audit_logs where org_id = $1", ids);
  await owner.query("delete from shops where org_id = $1", ids);
  await owner.query("delete from organisation_members where org_id = $1", ids);
  await owner.query("delete from organisations where id = $1", ids);
  await owner.query("delete from users where email like $1", [`%-${run}@test.invalid`]);
  await owner.end();
  await pool.end();
});

describe("shops and roles", () => {
  it("creates a second shop with no schema change (test 2)", async () => {
    const list = await shopsFor(owner);
    assert.deepEqual(list.map((s) => s.name), ["Shop A", "Shop B"]);
    const [b] = await db.select().from(shops).where(eq(shops.id, shopB));
    assert.equal(b.settlementCurrency, "USD");
  });

  it("gives the organisation owner every shop", async () => {
    assert.equal(await assertCanAccess(owner, shopA, "manage"), "owner");
    assert.equal(await assertCanAccess(owner, shopB, "manage"), "owner");
  });

  it("keeps a manager inside their own shop (test 4)", async () => {
    assert.equal(await assertCanAccess(manager, shopA, "manage"), "manager");
    await assert.rejects(assertCanAccess(manager, shopB, "view"), AccessDenied);
    assert.deepEqual((await shopsFor(manager)).map((s) => s.id), [shopA]);
  });

  it("lets staff view but not manage", async () => {
    assert.equal(await assertCanAccess(staff, shopA, "view"), "staff");
    await assert.rejects(assertCanAccess(staff, shopA, "manage"), AccessDenied);
  });

  it("treats a tampered or malformed id as not found", async () => {
    assert.equal(await shopRoleFor(manager, "not-a-uuid"), null);
    assert.equal(await shopRoleFor(manager, "00000000-0000-4000-8000-000000000000"), null);
  });

  it("only signs in with the right password", async () => {
    assert.ok(await verifyLogin(`OWNER-${run}@test.invalid`, password));
    assert.equal(await verifyLogin(`owner-${run}@test.invalid`, "wrong-password-here"), null);
    assert.equal(await verifyLogin(`nobody-${run}@test.invalid`, password), null);
  });
});

describe("database isolation (row-level security)", () => {
  it("shows a shop's rows only inside that shop's context (test 1)", async () => {
    await withShop(shopA, (tx) => tx.insert(shopSettings).values({ shopId: shopA, key: "cod", value: false }));
    const inA = await withShop(shopA, (tx) => tx.select().from(shopSettings));
    const inB = await withShop(shopB, (tx) => tx.select().from(shopSettings));
    const none = await db.select().from(shopSettings);
    assert.equal(inA.length, 1);
    assert.equal(inB.length, 0, "shop B context must not see shop A settings");
    assert.equal(none.length, 0, "no context must see nothing");
  });

  it("refuses to write another shop's row from inside a shop", async () => {
    await assert.rejects(
      withShop(shopB, (tx) => tx.insert(shopSettings).values({ shopId: shopA, key: "x", value: 1 })),
      pgError(/row-level security/),
    );
  });

  it("keeps the audit log append-only", async () => {
    await assert.rejects(
      db.update(auditLogs).set({ action: "tampered" }).where(eq(auditLogs.orgId, orgId)),
      pgError(/permission denied/),
    );
    await assert.rejects(db.delete(auditLogs).where(eq(auditLogs.orgId, orgId)), pgError(/permission denied/));
  });
});

describe("archiving keeps history (test 7)", () => {
  it("cannot hard-delete a shop that has history", async () => {
    await assert.rejects(db.delete(shops).where(eq(shops.id, shopA)), pgError(/foreign key/));
  });

  it("hides an archived shop from everyone", async () => {
    await db.update(shops).set({ archivedAt: sql`now()` }).where(eq(shops.id, shopB));
    assert.equal(await shopRoleFor(owner, shopB), null);
    assert.deepEqual((await shopsFor(owner)).map((s) => s.id), [shopA]);
  });
});
