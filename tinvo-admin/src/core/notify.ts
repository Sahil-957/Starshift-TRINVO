/**
 * Emails: alerts to the shop owner (ALERT_EMAIL) and order updates to customers.
 * Never throws: a mail problem is logged and must not break payment or fulfilment.
 */
import { eq } from "drizzle-orm";
import { db, withShop } from "../db/index.ts";
import { orderItems, orders, shops } from "../db/schema.ts";
import { formatMinor } from "../lib/india.ts";
import { sendMail } from "../lib/mail.ts";

const owner = () => process.env.ALERT_EMAIL || process.env.SMTP_USER || "";
const adminLink = (shopId: string, orderId?: string) =>
  process.env.ADMIN_URL ? `${process.env.ADMIN_URL.replace(/\/$/, "")}/s/${shopId}/orders${orderId ? `/${orderId}` : ""}` : "";

async function load(shopId: string, orderId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  return withShop(shopId, async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    return { shop, order, items };
  });
}

const safely = (what: string, fn: () => Promise<unknown>) =>
  fn().catch((e) => console.error(`email (${what}) failed:`, (e as Error).message));

const trackLink = (domain: string | null, number: string, email: string) =>
  domain ? `https://${domain}/order?number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}` : "";

/** After payment: tell the owner, confirm to the customer. */
export const notifyPaid = (shopId: string, orderId: string) =>
  safely("paid", async () => {
    const { shop, order: o, items } = await load(shopId, orderId);
    const money = (m: number) => formatMinor(m, o.currency);
    const lines = items.map((i) => `  ${i.title} × ${i.quantity}   ${money(i.unitPriceMinor * i.quantity)}`).join("\n");
    const a = o.shippingAddress;

    await sendMail({
      to: owner(),
      fromName: `${shop.name} orders`,
      subject: `New order ${o.number} · ${money(o.totalMinor)}`,
      text: `New paid order on ${shop.name}.\n\n${lines}\n\nTotal: ${money(o.totalMinor)}\nCustomer: ${o.customerName}, ${o.phone}, ${o.email}\nShip to: ${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city} ${a.pin}\n\n${adminLink(shopId, orderId)}`,
    });

    const track = trackLink(shop.primaryDomain, o.number, o.email);
    await sendMail({
      to: o.email,
      fromName: shop.name,
      replyTo: owner(),
      subject: `Your ${shop.name} order ${o.number} is confirmed`,
      text: `Hi ${o.customerName.split(/\s+/)[0]},\n\nThank you! We've received your payment and your order is confirmed.\n\n${lines}\n\nTotal paid: ${money(o.totalMinor)}\n\nYour tumbler is printed for you, then shipped. We'll email you the tracking link when it's on its way.${track ? `\n\nTrack your order any time:\n${track}` : ""}\n\nQuestions? Just reply to this email.\n\n— ${shop.name}`,
    });
  });

/** A paid order Qikink didn't accept: the owner needs to act. */
export const notifyFulfilmentFailed = (shopId: string, orderId: string, reason: string) =>
  safely("fulfilment", async () => {
    const { shop, order: o } = await load(shopId, orderId);
    await sendMail({
      to: owner(),
      fromName: `${shop.name} alerts`,
      subject: `Action needed: ${o.number} was not sent to Qikink`,
      text: `Order ${o.number} is paid but Qikink did not accept it.\n\nReason: ${reason}\n\nOpen the order, fix the cause, and click "Try again":\n${adminLink(shopId, orderId)}`,
    });
  });

/** Qikink dispatched it: send the customer the tracking link. */
export const notifyShipped = (shopId: string, orderId: string) =>
  safely("shipped", async () => {
    const { shop, order: o } = await load(shopId, orderId);
    const track = o.trackingUrl || trackLink(shop.primaryDomain, o.number, o.email);
    await sendMail({
      to: o.email,
      fromName: shop.name,
      replyTo: owner(),
      subject: `Your ${shop.name} order ${o.number} has shipped`,
      text: `Hi ${o.customerName.split(/\s+/)[0]},\n\nGood news: your order ${o.number} is on its way.${o.courier ? `\n\nCourier: ${o.courier}` : ""}${o.awb ? `\nTracking number (AWB): ${o.awb}` : ""}${track ? `\n\nTrack it here:\n${track}` : ""}\n\nQuestions? Just reply to this email.\n\n— ${shop.name}`,
    });
  });

/** The 30-minute sync started failing (sent once, not every run). */
export const notifySyncFailing = (shopId: string, error: string) =>
  safely("sync", async () => {
    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
    await sendMail({
      to: owner(),
      fromName: `${shop.name} alerts`,
      subject: `${shop.name}: order sync with Qikink is failing`,
      text: `The automatic order sync couldn't reach Qikink, so order status and tracking aren't updating.\n\nError: ${error}\n\nYou'll get no more of these until it recovers. Check Qikink's dashboard and your keys in Settings:\n${adminLink(shopId)}`,
    });
  });
