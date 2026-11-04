/**
 * The order lifecycle end to end, on the dev database and the real Qikink
 * sandbox. Only Razorpay's HTTP calls are simulated (no test keys yet); its
 * signatures are computed and verified for real.
 *
 *   npm test
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";
import { eq } from "drizzle-orm";
import pg from "pg";
import { pool, withShop } from "../db/index.ts";
import { orderEvents, orders } from "../db/schema.ts";
import { envCreds } from "../lib/qikink.ts";
import { putFile } from "../lib/storage.ts";
import { createApiKey, revokeApiKey, listApiKeys, shopForToken } from "./apikeys.ts";
import { createProduct, storefrontProducts } from "./catalogue.ts";
import { setCredentials } from "./credentials.ts";
import {
  cancelOrder,
  CheckoutError,
  confirmPayment,
  createCheckout,
  fulfil,
  getOrderDetail,
  handleRazorpayWebhook,
  lookupOrder,
  refundOrder,
} from "./orders.ts";
import { shopReport } from "./reports.ts";
import { setCheckoutSettings, updateShopDetails } from "./settings.ts";
import { createShop } from "./shops.ts";
import { createOwner } from "./users.ts";

if (process.env.NEON_BRANCH === "production") throw new Error("Refusing to run tests against production");

const run = Date.now().toString(36).slice(-6);
const rzp = { keyId: "rzp_test_fake", keySecret: "test-key-secret", webhookSecret: "test-webhook-secret" };
const raw = "https://raw.githubusercontent.com/Sahil-957/Starshift-TRINVO/main/";
let orgId = "";
let owner = "";
let shopId = "";
let bareShopId = "";

// Razorpay is simulated; everything else (Qikink, Neon) goes out for real
const realFetch = globalThis.fetch;
let rpOrders = 0;
mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url);
  if (!u.startsWith("https://api.razorpay.com/")) return realFetch(url, init);
  const body = JSON.parse(String(init?.body ?? "{}"));
  if (u.endsWith("/orders")) return Response.json({ id: `order_t${run}${++rpOrders}`, amount: body.amount, currency: body.currency, status: "created" });
  if (u.includes("/refund")) return Response.json({ id: `rfnd_t${run}`, status: "processed", amount: body.amount });
  return Response.json({ error: { description: "unexpected" } }, { status: 400 });
});

const sign = (s: string, secret: string) => createHmac("sha256", secret).update(s).digest("hex");
const address = { line1: "Flat 4, Sea View, Linking Road", line2: "Bandra West", city: "Mumbai", state: "MH", pin: "400050" };
const customer = { name: "Test Buyer", email: `buyer-${run}@test.invalid`, phone: "+91 98765 43210" };

before(async () => {
  const o = await createOwner({ email: `owner-${run}@test.invalid`, name: "Owner", password: "correct-horse-battery", orgName: `Commerce ${run}` });
  orgId = o.org.id;
  owner = o.user.id;
  shopId = (await createShop(owner, orgId, { name: "Shop", slug: `c-${run}`, settlementCurrency: "INR" })).id;
  bareShopId = (await createShop(owner, orgId, { name: "Bare", slug: `bare-${run}`, settlementCurrency: "INR" })).id;
  await updateShopDetails(owner, shopId, { name: "Shop", gstin: "27ABCDE1234F1Z5", originState: "MH", orderPrefix: "TST", primaryDomain: "" });
  await setCheckoutSettings(shopId, { shippingFlatMinor: 9900, freeShippingOverMinor: 200000, storefrontDeployHook: null });
  await setCredentials(shopId, "razorpay", rzp);
  await setCredentials(shopId, "qikink", envCreds());

  // a tiny print file in this shop's private storage
  const key = `shops/${shopId}/print-files/test.png`;
  await putFile(key, Buffer.from("89504e470d0a1a0a", "hex"), "image/png");
  const product = (slug: string, status: "active" | "draft") => ({
    name: `Tumbler ${slug}`,
    slug,
    tagline: "",
    description: "",
    status,
    price: "1490",
    compareAt: "",
    cost: "481.44",
    taxRatePercent: "18",
    hsnCode: "9617",
    supplierSku: "UTumb-Wh-20oz",
    printTypeId: "5",
    designCode: `t${run}`,
    printFileKey: key,
    printWidthIn: "9.3",
    printHeightIn: "8",
    mockupUrl: `${raw}public/products/cocoa-noir-hero.webp`,
  });
  await createProduct(shopId, product("cocoa", "active"));
  await createProduct(shopId, product("hidden", "draft"));
});

after(async () => {
  mock.restoreAll();
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED!.replace("sslmode=require", "sslmode=verify-full") });
  await c.connect();
  const inOrg = "(select id from shops where org_id = $1)";
  for (const t of ["order_events", "order_tax_lines", "order_items", "refunds", "webhook_events"]) {
    await c.query(`delete from ${t} where shop_id in ${inOrg}`, [orgId]);
  }
  for (const t of ["orders", "products", "shop_credentials", "shop_settings", "api_keys", "shop_members"]) {
    await c.query(`delete from ${t} where shop_id in ${inOrg}`, [orgId]);
  }
  await c.query("delete from audit_logs where org_id = $1", [orgId]);
  await c.query("delete from shops where org_id = $1", [orgId]);
  await c.query("delete from organisation_members where org_id = $1", [orgId]);
  await c.query("delete from organisations where id = $1", [orgId]);
  await c.query("delete from users where email like $1", [`%-${run}@test.invalid`]);
  await c.end();
  await pool.end();
});

describe("catalogue", () => {
  it("shows storefronts only active products", async () => {
    assert.deepEqual((await storefrontProducts(shopId)).map((p) => p.slug), ["cocoa"]);
  });
});

describe("checkout to delivery", () => {
  let first: Awaited<ReturnType<typeof createCheckout>>;

  it("prices from the database, adds shipping and GST, numbers per shop", async () => {
    first = await createCheckout(shopId, { items: [{ slug: "cocoa", quantity: 1 }], customer, address });
    assert.equal(first.orderNumber, "TST-1001");
    assert.equal(first.totalMinor, 149000 + 9900);
    assert.equal(first.razorpay.amount, first.totalMinor);
  });

  it("refuses draft products and empty carts", async () => {
    await assert.rejects(createCheckout(shopId, { items: [{ slug: "hidden", quantity: 1 }], customer, address }), CheckoutError);
    await assert.rejects(createCheckout(shopId, { items: [], customer, address }));
  });

  it("refuses a forged payment signature", async () => {
    await assert.rejects(
      confirmPayment(shopId, { razorpayOrderId: first.razorpay.orderId, razorpayPaymentId: "pay_x", razorpaySignature: "00".repeat(32) }),
      CheckoutError,
    );
  });

  it("accepts a signed payment and sends the order to the Qikink sandbox", async () => {
    const paymentId = `pay_t${run}`;
    const r = await confirmPayment(shopId, {
      razorpayOrderId: first.razorpay.orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: sign(`${first.razorpay.orderId}|${paymentId}`, rzp.keySecret),
    });
    assert.equal(r.number, "TST-1001");
    const [o] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.number, "TST-1001")));
    assert.equal(o.fulfilmentError, null, o.fulfilmentError ?? "");
    assert.equal(o.status, "in_production");
    assert.match(o.supplierOrderId ?? "", /^\d+$/, "Qikink sandbox order id");
  });

  it("ignores a repeated webhook for an order already paid", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: `pay_t${run}`, order_id: first.razorpay.orderId } } },
    });
    assert.equal(await handleRazorpayWebhook(shopId, body, "bad", "evt_1"), "invalid");
    assert.equal(await handleRazorpayWebhook(shopId, body, sign(body, rzp.webhookSecret), `evt_${run}`), "ok");
    assert.equal(await handleRazorpayWebhook(shopId, body, sign(body, rzp.webhookSecret), `evt_${run}`), "duplicate");
    const [o] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.number, "TST-1001")));
    const paid = await withShop(shopId, (tx) => tx.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)));
    assert.equal(paid.filter((e) => e.type === "paid").length, 1, "paid exactly once");
  });

  it("lets the customer look up the order with number and email only", async () => {
    assert.equal((await lookupOrder(shopId, "tst-1001", customer.email.toUpperCase()))?.status, "in_production");
    assert.equal(await lookupOrder(shopId, "TST-1001", "someone@else.invalid"), null);
  });

  it("refunds a paid order and reports it honestly", async () => {
    const [o] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.number, "TST-1001")));
    await refundOrder(owner, shopId, o.id, "test");
    const d = await getOrderDetail(shopId, o.id);
    assert.equal(d?.order.status, "refunded");
    const rep = await shopReport(shopId, "INR", 30);
    assert.equal(rep.orders, 1);
    assert.equal(rep.refunds, first.totalMinor);
    assert.equal(rep.totalRevenue, 0);
    assert.equal(rep.costOfGoods, 48144);
  });

  it("cancels only unpaid orders", async () => {
    const second = await createCheckout(shopId, { items: [{ slug: "cocoa", quantity: 2 }], customer, address });
    assert.equal(second.orderNumber, "TST-1002");
    assert.equal(second.totalMinor, 298000, "free shipping over ₹2,000");
    const [o] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.number, "TST-1002")));
    await cancelOrder(owner, shopId, o.id);
    await assert.rejects(cancelOrder(owner, shopId, o.id), CheckoutError);
  });

  it("records a clear error when the shop has no Qikink account", async () => {
    await assert.rejects(createCheckout(bareShopId, { items: [{ slug: "cocoa", quantity: 1 }], customer, address }), /Payments are not set up/);
    await fulfil(bareShopId, "00000000-0000-4000-8000-000000000000"); // no such order: no-op
  });
});

describe("storefront tokens", () => {
  it("resolve to exactly one shop until revoked", async () => {
    const token = await createApiKey(shopId, "TINVO site");
    assert.equal(await shopForToken(`Bearer ${token}`), shopId);
    assert.equal(await shopForToken(`Bearer ${token}x`), null);
    assert.equal(await shopForToken(token), null, "must be a Bearer header");
    const [k] = await listApiKeys(shopId);
    await revokeApiKey(shopId, k.id);
    assert.equal(await shopForToken(`Bearer ${token}`), null);
  });
});
