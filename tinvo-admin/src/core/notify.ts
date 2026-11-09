/**
 * Emails: alerts to the shop owner (ALERT_EMAIL) and order updates to customers,
 * designed in email-templates.ts. Never throws: a mail problem is logged and must
 * not break payment or fulfilment.
 */
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db, withShop } from "../db/index.ts";
import { orderItems, orders, shops } from "../db/schema.ts";
import { formatMinor, STATES } from "../lib/india.ts";
import { sendMail } from "../lib/mail.ts";
import { orderConfirmed, orderList, orderShipped, ownerAlert, ownerNewOrder, type Email } from "./email-templates.ts";

const owner = () => process.env.ALERT_EMAIL || process.env.SMTP_USER || "";
const adminLink = (shopId: string, orderId?: string) =>
  process.env.ADMIN_URL
    ? `${process.env.ADMIN_URL.replace(/\/$/, "")}/s/${shopId}${orderId ? `/orders/${orderId}` : ""}`
    : null;

async function load(shopId: string, orderId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  return withShop(shopId, async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const money = (m: number) => formatMinor(m, order.currency);
    const a = order.shippingAddress;
    return {
      shop,
      order,
      money,
      items: items.map((i) => ({ slug: i.slug, title: i.title, quantity: i.quantity, lineTotal: money(i.unitPriceMinor * i.quantity) })),
      address: `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${STATES[a.state] ?? a.state} ${a.pin}`,
      firstName: order.customerName.trim().split(/\s+/)[0],
      trackUrl: shop.primaryDomain
        ? `https://${shop.primaryDomain}/order?number=${encodeURIComponent(order.number)}&email=${encodeURIComponent(order.email)}`
        : null,
    };
  });
}

const safely = (what: string, fn: () => Promise<unknown>) =>
  fn().catch((e) => console.error(`email (${what}) failed:`, (e as Error).message));

const send = (to: string, e: Email, fromName: string, replyTo?: string) =>
  sendMail({ to, subject: e.subject, text: e.text, html: e.html, fromName, replyTo });

/** After payment: tell the owner, confirm to the customer. */
export const notifyPaid = (shopId: string, orderId: string) =>
  safely("paid", async () => {
    const d = await load(shopId, orderId);
    const o = d.order;
    await send(
      owner(),
      ownerNewOrder({
        shop: d.shop.name,
        domain: d.shop.primaryDomain,
        number: o.number,
        total: d.money(o.totalMinor),
        items: d.items,
        customer: o.customerName,
        contact: `${o.phone} · ${o.email}`,
        address: d.address,
        adminUrl: adminLink(shopId, orderId),
      }),
      `${d.shop.name} orders`,
    );
    await send(
      o.email,
      orderConfirmed({
        shop: d.shop.name,
        domain: d.shop.primaryDomain,
        firstName: d.firstName,
        number: o.number,
        items: d.items,
        subtotal: d.money(o.subtotalMinor),
        shipping: o.shippingMinor ? d.money(o.shippingMinor) : "Free",
        total: d.money(o.totalMinor),
        address: d.address,
        trackUrl: d.trackUrl,
      }),
      d.shop.name,
      owner(),
    );
  });

/** A paid order Qikink didn't accept: the owner needs to act. */
export const notifyFulfilmentFailed = (shopId: string, orderId: string, reason: string) =>
  safely("fulfilment", async () => {
    const d = await load(shopId, orderId);
    await send(
      owner(),
      ownerAlert({
        shop: d.shop.name,
        title: `${d.order.number} was not sent to Qikink`,
        detail: reason,
        what: "The customer has paid. Open the order, fix the cause, then click “Try again”. If it keeps failing, place it manually in the Qikink dashboard.",
        adminUrl: adminLink(shopId, orderId),
      }),
      `${d.shop.name} alerts`,
    );
  });

/** Qikink dispatched it: send the customer the tracking link. */
export const notifyShipped = (shopId: string, orderId: string) =>
  safely("shipped", async () => {
    const d = await load(shopId, orderId);
    await send(
      d.order.email,
      orderShipped({
        shop: d.shop.name,
        domain: d.shop.primaryDomain,
        firstName: d.firstName,
        number: d.order.number,
        items: d.items,
        courier: d.order.courier,
        awb: d.order.awb,
        trackUrl: d.order.trackingUrl || d.trackUrl,
      }),
      d.shop.name,
      owner(),
    );
  });

/** The 30-minute sync started failing (sent once, not every run). */
export const notifySyncFailing = (shopId: string, error: string) =>
  safely("sync", async () => {
    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
    await send(
      owner(),
      ownerAlert({
        shop: shop.name,
        title: "Order sync with Qikink is failing",
        detail: error,
        what: "Order status and tracking aren't updating. Check Qikink's dashboard and the keys in Settings. You won't get another of these until it recovers.",
        adminUrl: adminLink(shopId),
      }),
      `${shop.name} alerts`,
    );
  });

const STATUS: Record<string, string> = {
  paid: "Paid",
  in_production: "Printing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  returned: "Returned",
};

/**
 * "Email me my orders": sends every paid order on that address to that address,
 * so only whoever reads the inbox sees them. Sends nothing when there are none.
 */
export async function emailOrderList(shopId: string, email: string) {
  const addr = email.trim().toLowerCase();
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  const list = await withShop(shopId, (tx) =>
    tx
      .select()
      .from(orders)
      .where(and(eq(orders.shopId, shopId), eq(sql`lower(${orders.email})`, addr), ne(orders.status, "pending_payment")))
      .orderBy(desc(orders.createdAt))
      .limit(50),
  );
  if (!list.length) return 0;
  const e = orderList({
    shop: shop.name,
    domain: shop.primaryDomain,
    orders: list.map((o) => ({
      number: o.number,
      date: o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
      status: STATUS[o.status] ?? o.status,
      total: formatMinor(o.totalMinor, o.currency),
      url: shop.primaryDomain
        ? `https://${shop.primaryDomain}/order?number=${encodeURIComponent(o.number)}&email=${encodeURIComponent(o.email)}`
        : null,
    })),
  });
  await send(list[0].email, e, shop.name);
  return list.length;
}
