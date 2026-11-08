/**
 * The order lifecycle end to end, on the dev database and the real Qikink
 * sandbox. PayU's signatures are computed here from PayU's published formulas
 * (independently of src/lib/payu.ts); only PayU's server replies (verify,
 * refund) are simulated.
 *
 *   npm test
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";
import { eq, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import pg from "pg";
import { pool, withShop } from "../db/index.ts";
import { orderEvents, orders } from "../db/schema.ts";
import { envCreds } from "../lib/qikink.ts";
import { putFile } from "../lib/storage.ts";
import { createApiKey, listApiKeys, revokeApiKey, shopForToken } from "./apikeys.ts";
import { createProduct, lastProductEdit, listProducts, quickEdit, storefrontProducts } from "./catalogue.ts";
import { setCredentials } from "./credentials.ts";
import {
  attentionCounts,
  cancelOrder,
  CheckoutError,
  createCheckout,
  fulfil,
  getOrderDetail,
  handlePayuWebhook,
  listOrdersForShop,
  lookupOrder,
  ordersForExport,
  payuReturn,
  refundOrder,
  syncShop,
} from "./orders.ts";
import { shopReport } from "./reports.ts";
import { listReviews, pendingReviewCount, publicName, publishedReviews, setReviewStatus, submitReview } from "./reviews.ts";
import { getShopState, setCheckoutSettings, updateShopDetails } from "./settings.ts";
import { createShop } from "./shops.ts";
import { createOwner } from "./users.ts";

if (process.env.NEON_BRANCH === "production") throw new Error("Refusing to run tests against production");

const run = Date.now().toString(36).slice(-6);
const payu = { key: "testKey1", salt: "testSaltValue0123456789abcdefXYZ", env: "test" as const };
const back = "http://localhost:3000/api/checkout/payu";
const raw = "https://raw.githubusercontent.com/Sahil-957/Starshift-TRINVO/main/";
const sha512 = (s: string) => createHash("sha512").update(s).digest("hex");
let orgId = "";
let owner = "";
let shopId = "";
let bareShopId = "";

// PayU's server-to-server replies are simulated; Qikink and Neon go out for real
// emails are captured, not sent
process.env.SMTP_USER = "shop@test.invalid";
process.env.SMTP_PASS = "test";
process.env.ALERT_EMAIL = "owner@test.invalid";
process.env.ADMIN_URL = "https://admin.example";
const mails: { to: string; subject: string; text: string }[] = [];
mock.method(nodemailer, "createTransport", () => ({ sendMail: async (m: (typeof mails)[number]) => void mails.push(m) }));

const realFetch = globalThis.fetch;
const payuCalls: Record<string, string>[] = [];
const verified = new Map<string, { status: string; amt: string; mihpayid: string }>();
mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url);
  if (!u.startsWith("https://test.payu.in/merchant/postservice")) return realFetch(url, init);
  const f = Object.fromEntries(new URLSearchParams(String(init?.body)));
  payuCalls.push(f);
  if (f.hash !== sha512(`${f.key}|${f.command}|${f.var1}|${payu.salt}`)) return Response.json({ status: 0, msg: "Invalid Hash" });
  if (f.command === "verify_payment") {
    const t = verified.get(f.var1);
    return Response.json({ status: 1, transaction_details: { [f.var1]: t ?? { status: "Not Found", amt: "0", mihpayid: "" } } });
  }
  if (f.command === "cancel_refund_transaction") return Response.json({ status: 1, msg: "Refund Request Queued", request_id: `rq${run}` });
  return Response.json({ status: 0, msg: "unexpected" });
});

/** What PayU posts back: the response fields, signed with the reverse hash. */
function payuReply(fields: Record<string, string>, status: string, amount = fields.amount, mihpayid = `40${run}`) {
  const p: Record<string, string> = { ...fields, status, amount, mihpayid };
  // SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key  (udfs empty)
  p.hash = sha512(`${payu.salt}|${status}|||||||||||${p.email}|${p.firstname}|${p.productinfo}|${amount}|${p.txnid}|${p.key}`);
  return p;
}

const address = { line1: "Flat 4, Sea View, Linking Road", line2: "Bandra West", city: "Mumbai", state: "MH", pin: "400050" };
const customer = { name: "Test Buyer", email: `buyer-${run}@test.invalid`, phone: "+91 98765 43210" };
const orderNo = (n: string) => withShop(shopId, async (tx) => (await tx.select().from(orders).where(eq(orders.number, n)))[0]);

before(async () => {
  const o = await createOwner({ email: `owner-${run}@test.invalid`, name: "Owner", password: "correct-horse-battery", orgName: `Commerce ${run}` });
  orgId = o.org.id;
  owner = o.user.id;
  shopId = (await createShop(owner, orgId, { name: "Shop", slug: `c-${run}`, settlementCurrency: "INR" })).id;
  bareShopId = (await createShop(owner, orgId, { name: "Bare", slug: `bare-${run}`, settlementCurrency: "INR" })).id;
  await updateShopDetails(owner, shopId, { name: "Shop", gstin: "27ABCDE1234F1Z5", originState: "MH", orderPrefix: "TST", primaryDomain: "" });
  await setCheckoutSettings(shopId, { shippingFlatMinor: 9900, freeShippingOverMinor: 200000, storefrontDeployHook: null });
  await setCredentials(shopId, "payu", payu);
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
  for (const t of ["reviews", "order_events", "order_tax_lines", "order_items", "refunds", "webhook_events"]) {
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

describe("checkout to delivery (PayU)", () => {
  let first: Awaited<ReturnType<typeof createCheckout>>;

  it("prices from the database, adds shipping and GST, signs a PayU request", async () => {
    first = await createCheckout(shopId, { items: [{ slug: "cocoa", quantity: 1 }], customer, address }, back);
    assert.equal(first.orderNumber, "TST-1001");
    assert.equal(first.totalMinor, 149000 + 9900);
    const f = first.payu.fields;
    assert.equal(first.payu.action, "https://test.payu.in/_payment");
    assert.equal(f.amount, "1589.00");
    assert.equal(f.surl, back);
    // key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT  (udfs empty)
    assert.equal(f.hash, sha512(`${f.key}|${f.txnid}|${f.amount}|${f.productinfo}|${f.firstname}|${f.email}|||||||||||${payu.salt}`));
  });

  it("refuses draft products, empty carts and a non-https return URL", async () => {
    await assert.rejects(createCheckout(shopId, { items: [{ slug: "hidden", quantity: 1 }], customer, address }, back), CheckoutError);
    await assert.rejects(createCheckout(shopId, { items: [], customer, address }, back));
    await assert.rejects(createCheckout(shopId, { items: [{ slug: "cocoa", quantity: 1 }], customer, address }, "http://evil.example/x"));
  });

  it("refuses a forged PayU response", async () => {
    const forged = { ...payuReply(first.payu.fields, "success"), hash: "ab".repeat(64) };
    await assert.rejects(payuReturn(shopId, forged), CheckoutError);
    assert.equal((await orderNo("TST-1001")).status, "pending_payment");
  });

  it("does not mark paid on a failed payment or a different amount", async () => {
    assert.equal((await payuReturn(shopId, payuReply(first.payu.fields, "failure"))).paid, false);
    assert.equal((await payuReturn(shopId, payuReply(first.payu.fields, "success", "1.00"))).paid, false);
    assert.equal((await orderNo("TST-1001")).status, "pending_payment");
  });

  it("accepts a signed success and sends the order to the Qikink sandbox", async () => {
    const r = await payuReturn(shopId, payuReply(first.payu.fields, "success"));
    assert.deepEqual(r, { number: "TST-1001", email: customer.email, paid: true });
    const o = await orderNo("TST-1001");
    assert.equal(o.fulfilmentError, null, o.fulfilmentError ?? "");
    assert.equal(o.status, "in_production");
    assert.equal(o.paymentGatewayId, `40${run}`);
    assert.match(o.supplierOrderId ?? "", /^\d+$/, "Qikink sandbox order id");
  });

  it("handles the PayU webhook once, and refuses a bad one", async () => {
    const reply = payuReply(first.payu.fields, "success");
    assert.equal(await handlePayuWebhook(shopId, { ...reply, hash: "00" }), "invalid");
    assert.equal(await handlePayuWebhook(shopId, reply), "ok");
    assert.equal(await handlePayuWebhook(shopId, reply), "duplicate");
    const o = await orderNo("TST-1001");
    const events = await withShop(shopId, (tx) => tx.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)));
    assert.equal(events.filter((e) => e.type === "paid").length, 1, "paid exactly once");
  });

  it("emails the owner and the customer once per paid order", async () => {
    const about = mails.filter((m) => m.subject.includes("TST-1001"));
    assert.equal(about.filter((m) => m.to === "owner@test.invalid").length, 1, "one owner alert despite the webhook");
    const confirm = about.find((m) => m.to === customer.email);
    assert.match(confirm?.subject ?? "", /confirmed/);
    assert.match(confirm?.text ?? "", /Total paid/);
    assert.ok((about.find((m) => m.to === "owner@test.invalid")?.text ?? "").includes("https://admin.example/s/"));
  });

  it("lets the customer look up the order with number and email only", async () => {
    assert.equal((await lookupOrder(shopId, "tst-1001", customer.email.toUpperCase()))?.status, "in_production");
    assert.equal(await lookupOrder(shopId, "TST-1001", "someone@else.invalid"), null);
  });

  it("refunds through PayU and reports it honestly", async () => {
    const o = await orderNo("TST-1001");
    await refundOrder(owner, shopId, o.id, "test");
    const call = payuCalls.find((c) => c.command === "cancel_refund_transaction");
    assert.equal(call?.var1, `40${run}`, "refunds PayU's payment id");
    assert.equal(call?.var3, "1589.00");
    assert.equal((await getOrderDetail(shopId, o.id))?.order.status, "refunded");
    const rep = await shopReport(shopId, "INR", 30);
    assert.equal(rep.orders, 1);
    assert.equal(rep.refunds, first.totalMinor);
    assert.equal(rep.totalRevenue, 0);
    assert.equal(rep.costOfGoods, 48144);
  });

  it("catches a payment whose customer never came back (reconciliation)", async () => {
    const second = await createCheckout(shopId, { items: [{ slug: "cocoa", quantity: 2 }], customer, address }, back);
    assert.equal(second.totalMinor, 298000, "free shipping over ₹2,000");
    // the customer paid but closed the tab; the job runs a few minutes later
    verified.set(second.payu.fields.txnid, { status: "success", amt: "2980.00", mihpayid: `41${run}` });
    await withShop(shopId, (tx) =>
      tx.update(orders).set({ createdAt: sql`now() - interval '5 minutes'` }).where(eq(orders.number, second.orderNumber)),
    );
    await syncShop(shopId);
    const o = await orderNo(second.orderNumber);
    assert.equal(o.paymentGatewayId, `41${run}`);
    assert.equal(o.status, "in_production", o.fulfilmentError ?? "");
  });

  it("cancels only unpaid orders", async () => {
    const third = await createCheckout(shopId, { items: [{ slug: "cocoa", quantity: 1 }], customer, address }, back);
    const o = await orderNo(third.orderNumber);
    await cancelOrder(owner, shopId, o.id);
    await assert.rejects(cancelOrder(owner, shopId, o.id), CheckoutError);
  });

  it("says clearly when a shop has no payment gateway", async () => {
    await assert.rejects(createCheckout(bareShopId, { items: [{ slug: "cocoa", quantity: 1 }], customer, address }, back), /Payments are not set up/);
    await fulfil(bareShopId, "00000000-0000-4000-8000-000000000000"); // no such order: no-op
  });
});

describe("store maintenance", () => {
  it("finds orders by number, name, email or phone digits", async () => {
    const byNo = await listOrdersForShop(shopId, undefined, "tst-1001");
    assert.deepEqual(byNo.map((o) => o.number), ["TST-1001"]);
    assert.ok((await listOrdersForShop(shopId, undefined, "98765 43210")).length >= 2, "phone with a space");
    assert.equal((await listOrdersForShop(shopId, undefined, "nobody-matches-this")).length, 0);
  });

  it("counts what needs attention and exports paid orders", async () => {
    const a = await attentionCounts(shopId);
    assert.equal(a.notSent, 0);
    assert.equal(a.unpaid, 0, "the unpaid one was cancelled");
    const rows = await ordersForExport(shopId, 30);
    assert.ok(rows.length >= 2 && rows.every((r) => r.paidAt && r.items.length));
  });

  it("records the last sync for the overview", async () => {
    const s = await getShopState(shopId);
    assert.ok(s.lastSync?.at, "syncShop ran in the reconciliation test");
  });

  it("quick-edits only what changed and bumps the last-edit time", async () => {
    const before = await lastProductEdit(shopId);
    const list = await listProducts(shopId);
    const rows = list.map((p) => ({ id: p.id, price: String(p.priceMinor / 100), status: p.status }));
    assert.equal(await quickEdit(shopId, rows), 0, "nothing changed");
    const cocoa = rows.find((r) => list.find((p) => p.id === r.id)?.slug === "cocoa")!;
    assert.equal(await quickEdit(shopId, rows.map((r) => (r === cocoa ? { ...r, price: "999" } : r))), 1);
    assert.equal((await storefrontProducts(shopId))[0].priceMinor, 99900);
    assert.ok(new Date((await lastProductEdit(shopId))!) > new Date(before!));
    await assert.rejects(quickEdit(shopId, [{ ...cocoa, price: "abc" }]));
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

describe("reviews", () => {
  const review = (number: string, extra: Record<string, unknown> = {}) =>
    submitReview(shopId, { slug: "cocoa", number, email: customer.email.toUpperCase(), name: "Test Buyer", rating: 5, title: "Lovely", body: "Keeps coffee hot all morning.", ...extra });

  it("takes a review only from a paid order that has the design, once", async () => {
    const all = await listOrdersForShop(shopId);
    const paid = all.find((o) => ["paid", "in_production", "shipped", "delivered"].includes(o.status))!;
    const refunded = all.find((o) => o.status === "refunded")!;
    const unpaid = all.find((o) => o.status === "cancelled" || o.status === "pending_payment")!;
    await assert.rejects(review(refunded.number), CheckoutError, "refunded order");
    await assert.rejects(review(unpaid.number), CheckoutError, "unpaid order");
    await assert.rejects(submitReview(shopId, { slug: "cocoa", number: paid.number, email: "someone@else.invalid", name: "X", rating: 5, body: "Not my order at all." }), CheckoutError);
    await assert.rejects(review(paid.number, { slug: "hidden" }), CheckoutError, "design not in the order");
    await assert.rejects(review(paid.number, { rating: 6 }));
    await review(paid.number);
    await assert.rejects(review(paid.number), /already reviewed/);
    assert.ok(mails.some((m) => m.to === "owner@test.invalid" && /5★ review/.test(m.subject)), "owner told");
  });

  it("shows nothing publicly until published, then the average", async () => {
    assert.equal((await publishedReviews(shopId, "cocoa")).count, 0);
    assert.equal(await pendingReviewCount(shopId), 1);
    const [r] = await listReviews(shopId, "pending");
    await setReviewStatus(shopId, r.id, "published");
    const pub = await publishedReviews(shopId, "cocoa");
    assert.equal(pub.count, 1);
    assert.equal(pub.average, 5);
    assert.deepEqual(pub.breakdown, { 5: 1 });
    assert.equal((await publishedReviews(shopId)).reviews[0].slug, "cocoa", "latest across the shop");
    assert.equal(pub.reviews[0].author, "Test B.");
    await setReviewStatus(shopId, r.id, "hidden");
    assert.equal((await publishedReviews(shopId, "cocoa")).count, 0);
    assert.equal((await publishedReviews(bareShopId, "cocoa")).count, 0, "other shops see nothing");
  });

  it("shows only first name and last initial", () => {
    assert.equal(publicName("  priya   sharma "), "priya S.");
    assert.equal(publicName("Asha"), "Asha");
  });
});
