/**
 * Order lifecycle: checkout -> paid -> sent to supplier -> shipped -> delivered,
 * plus refunds and cancellation. Every step writes an order_event.
 *
 * Money is always computed here from database prices, never taken from a storefront.
 * Payment (PayU) is accepted only with a valid signature, PayU's "success" and the
 * exact order total; marking paid is a conditional update, so the customer's return,
 * the webhook and the reconciliation job can all arrive safely.
 */
import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
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
import * as payu from "../lib/payu.ts";
import { signedUrl } from "../lib/storage.ts";
import { getCredentials } from "./credentials.ts";
import { priceOrder } from "./pricing.ts";
import { notifyFulfilmentFailed, notifyPaid, notifyShipped, notifySyncFailing } from "./notify.ts";
import { getCheckoutSettings, getShopState, setShopState } from "./settings.ts";

/** A message for the shopper; `field` names the form field it belongs to, when there is one. */
export class CheckoutError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

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
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
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

/** Where PayU posts the customer back: the storefront's own return route. */
const returnUrl = z
  .url()
  .refine((u) => u.startsWith("https://") || /^http:\/\/localhost(:\d+)?\//.test(u), "Return URL must be https");

export async function createCheckout(shopId: string, raw: CheckoutInput, payuReturnUrl: string) {
  const input = checkoutInput.parse(raw);
  const back = returnUrl.parse(payuReturnUrl);
  const payuCreds = await getCredentials(shopId, "payu");
  if (!payuCreds) throw new CheckoutError("Payments are not set up for this shop yet.");
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

  // txnid: unique per payment attempt, letters and digits only (≤25)
  const txnid = `${order.number.replace(/[^A-Za-z0-9]/g, "")}${randomBytes(3).toString("hex")}`;
  const fields = payu.signRequest(payuCreds, {
    txnid,
    amount: payu.amount(order.totalMinor),
    productinfo: `Order ${order.number}`,
    firstname: input.customer.name.split(/\s+/)[0],
    email: input.customer.email,
    phone: input.customer.phone,
    surl: back,
    furl: back,
  });
  await withShop(shopId, async (tx) => {
    await tx.update(orders).set({ paymentTxnId: txnid }).where(eq(orders.id, order.id));
    await event(tx, shopId, order.id, "payment.started", { txnid, env: payuCreds.env });
  });
  return {
    orderNumber: order.number,
    totalMinor: order.totalMinor,
    currency: order.currency,
    payu: { action: payu.paymentUrl(payuCreds), fields },
  };
}

// ─── payment ────────────────────────────────────────────────────────────────

/** Marks the order paid once, whoever reports it first. Returns the order id if this call did it. */
async function markPaid(shopId: string, txnid: string, paymentId: string, source: string) {
  const id = await withShop(shopId, async (tx) => {
    const [o] = await tx
      .update(orders)
      .set({ status: "paid", paymentGatewayId: paymentId, paidAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(orders.paymentTxnId, txnid), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });
    if (o) await event(tx, shopId, o.id, "paid", { paymentId, source });
    return o?.id ?? null;
  });
  if (id) {
    await fulfil(shopId, id).catch(() => {}); // failures are recorded on the order
    await notifyPaid(shopId, id);
  }
  return id;
}

/**
 * PayU's answer, from the customer's return post or a webhook. Paid only when
 * the signature is valid, PayU says success, and the amount is the order total.
 */
async function settlePayu(shopId: string, p: Record<string, string>, source: string) {
  const creds = await getCredentials(shopId, "payu");
  if (!creds || !payu.verifyResponse(creds, p)) return { valid: false as const };
  const [o] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.paymentTxnId, p.txnid)));
  if (!o) return { valid: false as const };
  const ok = p.status === "success" && p.amount === payu.amount(o.totalMinor);
  if (ok) {
    await markPaid(shopId, p.txnid, p.mihpayid, source);
  } else if (o.status === "pending_payment") {
    await withShop(shopId, (tx) =>
      event(tx, shopId, o.id, "payment.failed", { status: p.status, error: p.error_Message || p.error || null, source }),
    );
  }
  const [after] = await withShop(shopId, (tx) =>
    tx.select({ number: orders.number, email: orders.email, status: orders.status }).from(orders).where(eq(orders.id, o.id)),
  );
  return { valid: true as const, ...after, paid: after.status !== "pending_payment" && after.status !== "cancelled" };
}

/** The customer's browser coming back from PayU (forwarded by the storefront). */
export async function payuReturn(shopId: string, fields: Record<string, string>) {
  const r = await settlePayu(shopId, fields, "return");
  if (!r.valid) throw new CheckoutError("We couldn't verify that payment.");
  return { number: r.number, email: r.email, paid: r.paid };
}

/** PayU webhook (form-encoded or JSON). Idempotent per payment and status. */
export async function handlePayuWebhook(shopId: string, fields: Record<string, string>) {
  const creds = await getCredentials(shopId, "payu");
  if (!creds || !payu.verifyResponse(creds, fields)) return "invalid";
  const fresh = await withShop(shopId, (tx) =>
    tx
      .insert(webhookEvents)
      .values({ shopId, provider: "payu", externalId: `${fields.mihpayid}:${fields.status}`, payload: fields })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id }),
  );
  if (!fresh.length) return "duplicate";
  await settlePayu(shopId, fields, "webhook");
  return "ok";
}

// ─── fulfilment (Qikink) ────────────────────────────────────────────────────

/** Sends a paid order to Qikink. Safe to retry: Qikink refuses a duplicate reference. */
export async function fulfil(shopId: string, orderId: string) {
  const creds = await getCredentials(shopId, "qikink");
  const [order] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.id, orderId)));
  if (!order || order.status !== "paid" || order.supplierOrderId) return;

  const fail = async (message: string) => {
    await withShop(shopId, async (tx) => {
      await tx.update(orders).set({ fulfilmentError: message, updatedAt: sql`now()` }).where(eq(orders.id, orderId));
      await event(tx, shopId, orderId, "fulfilment.failed", { message });
    });
    await notifyFulfilmentFailed(shopId, orderId, message);
  };
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

/**
 * PayU payments whose customer never came back (closed the tab, lost signal):
 * ask PayU directly. Unpaid after 3 days, the order is left for manual review.
 */
async function reconcilePayu(shopId: string) {
  const creds = await getCredentials(shopId, "payu");
  if (!creds) return 0;
  const waiting = await withShop(shopId, (tx) =>
    tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shopId),
          eq(orders.status, "pending_payment"),
          isNotNull(orders.paymentTxnId),
          lt(orders.createdAt, sql`now() - interval '2 minutes'`),
          gte(orders.createdAt, sql`now() - interval '3 days'`),
        ),
      ),
  );
  let paid = 0;
  for (const o of waiting) {
    const t = await payu.verifyPayment(creds, o.paymentTxnId!).catch(() => null);
    if (t?.status === "success" && Number(t.amt).toFixed(2) === payu.amount(o.totalMinor)) {
      if (await markPaid(shopId, o.paymentTxnId!, t.mihpayid, "reconcile")) paid++;
    }
  }
  return paid;
}

/** Reconciles PayU, pulls Qikink status/tracking, and records the result for the overview. */
export async function syncShop(shopId: string) {
  const before = (await getShopState(shopId).catch(() => null))?.lastSync;
  const r = await runSync(shopId);
  await setShopState(shopId, "lastSync", { at: new Date().toISOString(), ...r }).catch(() => {});
  // alert once when it starts failing, not every 30 minutes
  if (r.error && !before?.error) await notifySyncFailing(shopId, r.error);
  return r;
}

/** Pulls status, courier and AWB from Qikink for this shop's open orders. */
async function runSync(shopId: string) {
  await reconcilePayu(shopId).catch((e) => console.error("payu reconcile", e));
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
        // first time we see it shipped: send the customer the tracking link
        if (next === "shipped" && o.status !== "shipped") await notifyShipped(shopId, o.id);
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
  const [order] = await withShop(shopId, (tx) => tx.select().from(orders).where(eq(orders.id, orderId)));
  if (!order?.paymentGatewayId || ["pending_payment", "cancelled", "refunded"].includes(order.status)) {
    throw new CheckoutError("Only paid orders can be refunded.");
  }
  const creds = await getCredentials(shopId, "payu");
  if (!creds) throw new CheckoutError("PayU is not connected.");
  const token = `rf${order.number.replace(/[^A-Za-z0-9]/g, "")}${randomBytes(3).toString("hex")}`;
  const r = { ...(await payu.refund(creds, order.paymentGatewayId, order.totalMinor, token)), amount: order.totalMinor };
  await withShop(shopId, async (tx) => {
    await tx.insert(refunds).values({
      shopId,
      orderId,
      gatewayRefundId: r.id,
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

export const listOrdersForShop = (shopId: string, status?: string, search?: string) => {
  // order number, name, email or phone (digits only, so "98765 43210" matches)
  const q = search?.trim();
  const digits = q?.replace(/\D/g, "");
  return withShop(shopId, (tx) =>
    tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shopId),
          status ? eq(orders.status, status as (typeof orders.status.enumValues)[number]) : undefined,
          q
            ? or(
                ilike(orders.number, `%${q}%`),
                ilike(orders.customerName, `%${q}%`),
                ilike(orders.email, `%${q}%`),
                digits && digits.length >= 4 ? ilike(orders.phone, `%${digits.slice(-10)}%`) : undefined,
              )
            : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(200),
  );
};

/** What needs a person: paid orders Qikink hasn't got, and recent unpaid checkouts. */
export const attentionCounts = (shopId: string) =>
  withShop(shopId, async (tx) => {
    const [r] = await tx
      .select({
        notSent: sql<number>`count(*) filter (where ${orders.status} = 'paid' and ${orders.fulfilmentError} is not null)::int`,
        sending: sql<number>`count(*) filter (where ${orders.status} = 'paid' and ${orders.fulfilmentError} is null)::int`,
        unpaid: sql<number>`count(*) filter (where ${orders.status} = 'pending_payment' and ${orders.createdAt} > now() - interval '7 days')::int`,
      })
      .from(orders)
      .where(eq(orders.shopId, shopId));
    return r;
  });

/** Paid orders in the last `days`, with their items, for the spreadsheet export. */
export const ordersForExport = (shopId: string, days: number) =>
  withShop(shopId, async (tx) => {
    const rows = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.shopId, shopId), isNotNull(orders.paidAt), gte(orders.paidAt, sql`now() - make_interval(days => ${days})`)))
      .orderBy(desc(orders.paidAt));
    const items = rows.length
      ? await tx.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((o) => o.id)))
      : [];
    return rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
  });

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
