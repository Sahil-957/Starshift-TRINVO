/**
 * Order lifecycle: checkout -> paid -> sent to supplier -> shipped -> delivered,
 * plus refunds and cancellation. Every step writes an order_event.
 *
 * Money is always computed here from database prices, never taken from a storefront.
 * Payment is accepted only with a valid Razorpay signature, and marking paid is a
 * conditional update, so the checkout callback and the webhook can both arrive safely.
 */
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, withShop, type Tx } from "../db/index.ts";
import {
  orderEvents,
  orderItems,
  orderTaxLines,
  orders,
  products,
  refunds,
  shops,
  webhookEvents,
  type ShippingAddress,
} from "../db/schema.ts";
import { normalisePhone, PIN, STATES } from "../lib/india.ts";
import * as qikink from "../lib/qikink.ts";
import * as razorpay from "../lib/razorpay.ts";
import { signedUrl } from "../lib/storage.ts";
import { getCredentials } from "./credentials.ts";
import { priceOrder } from "./pricing.ts";
import { getCheckoutSettings } from "./settings.ts";

export class CheckoutError extends Error {}

const event = (tx: Tx, shopId: string, orderId: string, type: string, data?: unknown) =>
  tx.insert(orderEvents).values({ shopId, orderId, type, data: data ?? null });

// ─── checkout ───────────────────────────────────────────────────────────────

export const checkoutInput = z.object({
  items: z
    .array(z.object({ slug: z.string().min(1).max(80), quantity: z.number().int().min(1).max(10) }))
    .min(1, "Your cart is empty")
    .max(20),
  customer: z.object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.email("Enter a valid email").transform((v) => v.trim().toLowerCase()),
    phone: z.string().transform((v, ctx) => {
      const p = normalisePhone(v);
      if (!p) ctx.addIssue({ code: "custom", message: "Enter a 10-digit mobile number" });
      return p ?? "";
    }),
  }),
  address: z.object({
    line1: z.string().trim().min(3, "Enter your address").max(90, "Keep the first line under 90 characters"),
    line2: z.string().trim().max(90).optional(),
    city: z.string().trim().min(2, "Enter your city").max(60),
    state: z.string().refine((v) => v in STATES, "Choose your state"),
    pin: z.string().trim().regex(PIN, "Enter a 6-digit PIN code"),
  }),
});
export type CheckoutInput = z.input<typeof checkoutInput>;

export async function createCheckout(shopId: string, raw: CheckoutInput) {
  const input = checkoutInput.parse(raw);
  const rzp = await getCredentials(shopId, "razorpay");
  if (!rzp) throw new CheckoutError("Payments are not set up for this shop yet.");
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  const settings = await getCheckoutSettings(shopId);

  // merge repeated slugs, then price from the database
  const qty = new Map<string, number>();
  for (const i of input.items) qty.set(i.slug, Math.min(10, (qty.get(i.slug) ?? 0) + i.quantity));
  const found = await withShop(shopId, (tx) =>
    tx
      .select()
      .from(products)
      .where(and(eq(products.shopId, shopId), eq(products.status, "active"), inArray(products.slug, [...qty.keys()]))),
  );
  const missing = [...qty.keys()].filter((s) => !found.some((p) => p.slug === s));
  if (missing.length) throw new CheckoutError(`No longer available: ${missing.join(", ")}`);

  const lines = found.map((p) => ({ product: p, quantity: qty.get(p.slug)! }));
  const totals = priceOrder({
    lines: lines.map((l) => ({ unitPriceMinor: l.product.priceMinor, quantity: l.quantity, taxRateBps: l.product.taxRateBps })),
    shippingFlatMinor: settings.shippingFlatMinor,
    freeShippingOverMinor: settings.freeShippingOverMinor,
    gstin: shop.gstin,
    originState: shop.originState,
    destinationState: input.address.state,
  });

  // per-shop sequence: TNV-1001, TNV-1002…
  const [{ n }] = await db
    .update(shops)
    .set({ nextOrderNumber: sql`${shops.nextOrderNumber} + 1` })
    .where(eq(shops.id, shopId))
    .returning({ n: sql<number>`${shops.nextOrderNumber} - 1` });
  const number = `${shop.orderPrefix}-${n}`;

  const order = await withShop(shopId, async (tx) => {
    const [o] = await tx
      .insert(orders)
      .values({
        shopId,
        number,
        customerName: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        shippingAddress: { ...input.address, country: "IN" } satisfies ShippingAddress,
        currency: shop.settlementCurrency,
        subtotalMinor: totals.subtotalMinor,
        shippingMinor: totals.shippingMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        taxTreatment: totals.taxTreatment,
      })
      .returning();
    await tx.insert(orderItems).values(
      lines.map((l) => ({
        shopId,
        orderId: o.id,
        productId: l.product.id,
        slug: l.product.slug,
        title: l.product.name,
        unitPriceMinor: l.product.priceMinor,
        costMinor: l.product.costMinor,
        quantity: l.quantity,
      })),
    );
    if (totals.taxLines.length) {
      await tx.insert(orderTaxLines).values(totals.taxLines.map((t) => ({ shopId, orderId: o.id, ...t })));
    }
    await event(tx, shopId, o.id, "created", { total: totals.totalMinor });
    return o;
  });

  const rp = await razorpay.createOrder(rzp, order.totalMinor, order.currency, order.number);
  await withShop(shopId, async (tx) => {
    await tx.update(orders).set({ razorpayOrderId: rp.id }).where(eq(orders.id, order.id));
    await event(tx, shopId, order.id, "payment.started", { razorpayOrderId: rp.id });
  });
  return {
    orderNumber: order.number,
    totalMinor: order.totalMinor,
    currency: order.currency,
    razorpay: { keyId: rzp.keyId, orderId: rp.id, amount: rp.amount, currency: rp.currency },
  };
}

// ─── payment ────────────────────────────────────────────────────────────────

/** Marks the order paid once, whoever reports it first. Returns the order id if this call did it. */
async function markPaid(shopId: string, razorpayOrderId: string, paymentId: string, source: string) {
  const id = await withShop(shopId, async (tx) => {
    const [o] = await tx
      .update(orders)
      .set({ status: "paid", razorpayPaymentId: paymentId, paidAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });
    if (o) await event(tx, shopId, o.id, "paid", { paymentId, source });
    return o?.id ?? null;
  });
  if (id) await fulfil(shopId, id).catch(() => {}); // failures are recorded on the order
  return id;
}

/** Browser callback after Razorpay checkout. */
export async function confirmPayment(
  shopId: string,
  p: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  const rzp = await getCredentials(shopId, "razorpay");
  if (!rzp || !razorpay.verifyPayment(rzp, p.razorpayOrderId, p.razorpayPaymentId, p.razorpaySignature)) {
    throw new CheckoutError("We couldn't verify that payment.");
  }
  await markPaid(shopId, p.razorpayOrderId, p.razorpayPaymentId, "checkout");
  const [o] = await withShop(shopId, (tx) =>
    tx.select({ number: orders.number, status: orders.status }).from(orders).where(eq(orders.razorpayOrderId, p.razorpayOrderId)),
  );
  return o;
}

/** Razorpay webhook (payment.captured / order.paid). Idempotent on the event id. */
export async function handleRazorpayWebhook(shopId: string, rawBody: string, signature: string, eventId: string) {
  const rzp = await getCredentials(shopId, "razorpay");
  if (!rzp?.webhookSecret || !razorpay.verifyWebhook(rzp, rawBody, signature)) return "invalid";
  const body = JSON.parse(rawBody);
  const fresh = await withShop(shopId, (tx) =>
    tx
      .insert(webhookEvents)
      .values({ shopId, provider: "razorpay", externalId: eventId, payload: body })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id }),
  );
  if (!fresh.length) return "duplicate";
  const payment = body?.payload?.payment?.entity;
  if (["payment.captured", "order.paid"].includes(body.event) && payment?.order_id && payment?.id) {
    await markPaid(shopId, payment.order_id, payment.id, `webhook:${body.event}`);
  }
  return "ok";
}

// ─── fulfilment (Qikink) ────────────────────────────────────────────────────

/** Sends a paid order to Qikink. Safe to retry: Qikink refuses a duplicate reference. */
export async function fulfil(shopId: string, orderId: string) {
  const creds = await getCredentials(shopId, "qikink");
  const [order] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.id, orderId)));
  if (!order || order.status !== "paid" || order.supplierOrderId) return;

  const fail = (message: string) =>
    withShop(shopId, async (tx) => {
      await tx.update(orders).set({ fulfilmentError: message, updatedAt: sql`now()` }).where(eq(orders.id, orderId));
      await event(tx, shopId, orderId, "fulfilment.failed", { message });
    });
  if (!creds) return fail("Qikink is not connected for this shop (Settings → Integrations).");

  const lines = await withShop(shopId, (tx) =>
    tx
      .select({ item: orderItems, product: products })
      .from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, orderId)),
  );

  try {
    const lineItems: qikink.LineItem[] = [];
    for (const { item, product: p } of lines) {
      if (!p?.supplierSku) throw new Error(`${item.title} has no supplier SKU (edit the product)`);
      const price = String(item.unitPriceMinor / 100);
      if (p.printFileKey) {
        if (!p.designCode || !p.printTypeId || !p.mockupUrl || !p.printWidthIn || !p.printHeightIn) {
          throw new Error(`${item.title} needs design code, print type, size and mockup URL`);
        }
        lineItems.push({
          search_from_my_products: 0,
          sku: p.supplierSku,
          print_type_id: p.printTypeId,
          quantity: String(item.quantity),
          price,
          designs: [
            {
              design_code: p.designCode,
              width_inches: p.printWidthIn,
              height_inches: p.printHeightIn,
              placement_sku: "fr",
              // a week is the longest S3 signatures allow; Qikink fetches it at print time
              design_link: await signedUrl(p.printFileKey, 7 * 24 * 3600),
              mockup_link: p.mockupUrl,
            },
          ],
        });
      } else {
        // product already set up in Qikink "My Products"
        lineItems.push({ search_from_my_products: 1, sku: p.supplierSku, quantity: String(item.quantity), price });
      }
    }

    const a = order.shippingAddress;
    const [first, ...rest] = order.customerName.trim().split(/\s+/);
    // unique per Qikink account even if two shops share a prefix: "tnv1001_3768" (≤15 chars)
    const reference = `${order.number.toLowerCase().replace(/[^a-z0-9]/g, "")}_${shopId.slice(0, 4)}`.slice(0, 15);
    try {
      const r = await qikink.createOrder(
        {
          order_number: reference,
          qikink_shipping: "1",
          gateway: "Prepaid",
          total_order_value: String(order.totalMinor / 100),
          line_items: lineItems,
          shipping_address: {
            first_name: first,
            last_name: rest.join(" ") || undefined,
            address1: a.line1,
            address2: a.line2 || undefined,
            phone: order.phone,
            email: order.email,
            city: a.city,
            zip: a.pin,
            province: STATES[a.state],
            country_code: "IN",
          },
        },
        creds,
      );
      await withShop(shopId, async (tx) => {
        await tx
          .update(orders)
          .set({
            status: "in_production",
            supplierReference: reference,
            supplierOrderId: String(r.order_id),
            supplierStatus: "Submitted",
            fulfilmentError: null,
            updatedAt: sql`now()`,
          })
          .where(eq(orders.id, orderId));
        await event(tx, shopId, orderId, "fulfilment.sent", { supplierOrderId: r.order_id, env: creds.env });
      });
    } catch (e) {
      // already sent on an earlier attempt whose reply was lost
      if (!/Duplicate Order/i.test((e as Error).message)) throw e;
      await withShop(shopId, async (tx) => {
        await tx
          .update(orders)
          .set({ status: "in_production", supplierReference: reference, supplierStatus: "Submitted", fulfilmentError: null })
          .where(eq(orders.id, orderId));
        await event(tx, shopId, orderId, "fulfilment.duplicate", { reference });
      });
    }
  } catch (e) {
    await fail((e as Error).message);
  }
}

/** Pulls status, courier and AWB from Qikink for this shop's open orders. */
export async function syncShop(shopId: string) {
  const creds = await getCredentials(shopId, "qikink");
  if (!creds) return { checked: 0, updated: 0, error: "Qikink not connected" };
  const open = await withShop(shopId, (tx) =>
    tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shopId),
          isNotNull(orders.supplierOrderId),
          inArray(orders.status, ["in_production", "shipped"]),
        ),
      ),
  );
  let updated = 0;
  try {
    for (let i = 0; i < open.length; i += 10) {
      const batch = open.slice(i, i + 10);
      const { data } = await qikink.listOrders({ ids: batch.map((o) => o.supplierOrderId).join(",") }, creds);
      for (const q of data) {
        const o = batch.find((b) => b.supplierOrderId === String(q.order_id));
        if (!o) continue;
        const next = qikink.mapStatus(q.status) ?? o.status;
        await withShop(shopId, async (tx) => {
          await tx
            .update(orders)
            .set({
              status: next,
              supplierStatus: q.status,
              awb: q.shipping.awb,
              courier: q.shipping.courier_provider_name?.trim() || null,
              trackingUrl: q.shipping.awb ? q.shipping.tracking_link : null,
              deliveredAt: q.delivered_on ? new Date(q.delivered_on.replace(" ", "T") + "+05:30") : null,
              syncedAt: sql`now()`,
              updatedAt: sql`now()`,
            })
            .where(eq(orders.id, o.id));
          if (next !== o.status || q.status !== o.supplierStatus) {
            await event(tx, shopId, o.id, "fulfilment.status", { supplier: q.status, status: next, awb: q.shipping.awb });
          }
        });
        updated++;
      }
    }
    return { checked: open.length, updated, error: null };
  } catch (e) {
    return { checked: open.length, updated, error: (e as Error).message };
  }
}

// ─── refunds and cancellation ───────────────────────────────────────────────

export async function refundOrder(actorId: string, shopId: string, orderId: string, reason: string) {
  const rzp = await getCredentials(shopId, "razorpay");
  const [order] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.id, orderId)));
  if (!order?.razorpayPaymentId || ["pending_payment", "cancelled", "refunded"].includes(order.status)) {
    throw new CheckoutError("Only paid orders can be refunded.");
  }
  if (!rzp) throw new CheckoutError("Razorpay is not connected.");
  const r = await razorpay.refundPayment(rzp, order.razorpayPaymentId, order.totalMinor);
  await withShop(shopId, async (tx) => {
    await tx.insert(refunds).values({
      shopId,
      orderId,
      razorpayRefundId: r.id,
      amountMinor: r.amount,
      status: r.status,
      reason: reason || null,
      createdBy: actorId,
    });
    await tx.update(orders).set({ status: "refunded", updatedAt: sql`now()` }).where(eq(orders.id, orderId));
    await event(tx, shopId, orderId, "refunded", { amount: r.amount, refundId: r.id, reason, by: actorId });
  });
}

/** Only unpaid orders; a paid order is refunded instead. */
export async function cancelOrder(actorId: string, shopId: string, orderId: string) {
  await withShop(shopId, async (tx) => {
    const [o] = await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: sql`now()` })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });
    if (!o) throw new CheckoutError("Only unpaid orders can be cancelled.");
    await event(tx, shopId, orderId, "cancelled", { by: actorId });
  });
}

// ─── reads ──────────────────────────────────────────────────────────────────

export const listOrdersForShop = (shopId: string, status?: string) =>
  withShop(shopId, (tx) =>
    tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shopId),
          status ? eq(orders.status, status as (typeof orders.status.enumValues)[number]) : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(200),
  );

export async function getOrderDetail(shopId: string, orderId: string) {
  if (!z.uuid().safeParse(orderId).success) return null;
  return withShop(shopId, async (tx) => {
    const [order] = await tx.select().from(orders).where(and(eq(orders.shopId, shopId), eq(orders.id, orderId)));
    if (!order) return null;
    // one connection per transaction: queries run in sequence, not in parallel
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const tax = await tx.select().from(orderTaxLines).where(eq(orderTaxLines.orderId, orderId));
    const events = await tx.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(desc(orderEvents.createdAt));
    const refundRows = await tx.select().from(refunds).where(eq(refunds.orderId, orderId));
    return { order, items, tax, events, refunds: refundRows };
  });
}

/** For the storefront's "track my order": needs both number and email. */
export async function lookupOrder(shopId: string, number: string, email: string) {
  const [o] = await withShop(shopId, (tx) =>
    tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shopId),
          eq(orders.number, number.trim().toUpperCase()),
          eq(sql`lower(${orders.email})`, email.trim().toLowerCase()),
        ),
      ),
  );
  if (!o) return null;
  const items = await withShop(shopId, (tx) =>
    tx.select({ title: orderItems.title, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, o.id)),
  );
  return {
    number: o.number,
    status: o.status,
    placedAt: o.createdAt,
    totalMinor: o.totalMinor,
    currency: o.currency,
    courier: o.courier,
    awb: o.awb,
    trackingUrl: o.trackingUrl,
    deliveredAt: o.deliveredAt,
    items,
  };
}
