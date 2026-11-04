/**
 * Sales figures, per the definitions in proposal §4 (shown on the Reports page).
 * Counted: orders that were paid (paid_at set) in the period, in the shop's
 * settlement currency. Prices are tax-inclusive, so tax is carved out of sales.
 *   Gross sales   items as charged (incl. tax)
 *   Net sales     gross − discounts − refunds − tax on items
 *   Total revenue what customers paid − refunds
 *   Gross profit  net sales − cost of goods
 */
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { withShop } from "../db/index.ts";
import { orderItems, orders, refunds } from "../db/schema.ts";

export type Report = {
  currency: string;
  orders: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  tax: number;
  shipping: number;
  netSales: number;
  totalRevenue: number;
  costOfGoods: number;
  /** null when some sold items have no cost entered */
  grossProfit: number | null;
  aov: number;
  bestSellers: { title: string; quantity: number; revenue: number }[];
};

export async function shopReport(shopId: string, currency: string, days: number): Promise<Report> {
  const since = sql`now() - make_interval(days => ${days})`;
  return withShop(shopId, async (tx) => {
    const counted = and(eq(orders.shopId, shopId), isNotNull(orders.paidAt), gte(orders.paidAt, since));
    const [o] = await tx
      .select({
        orders: sql<number>`count(*)::int`,
        gross: sql<number>`coalesce(sum(${orders.subtotalMinor}), 0)::int`,
        discounts: sql<number>`coalesce(sum(${orders.discountMinor}), 0)::int`,
        tax: sql<number>`coalesce(sum(${orders.taxMinor}), 0)::int`,
        shipping: sql<number>`coalesce(sum(${orders.shippingMinor}), 0)::int`,
        paid: sql<number>`coalesce(sum(${orders.totalMinor}), 0)::int`,
      })
      .from(orders)
      .where(counted);
    const [r] = await tx
      .select({ refunded: sql<number>`coalesce(sum(${refunds.amountMinor}), 0)::int` })
      .from(refunds)
      .innerJoin(orders, eq(orders.id, refunds.orderId))
      .where(counted);
    const [c] = await tx
      .select({
        cost: sql<number>`coalesce(sum(${orderItems.costMinor} * ${orderItems.quantity}), 0)::int`,
        missing: sql<number>`count(*) filter (where ${orderItems.costMinor} is null)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(counted);
    const best = await tx
      .select({
        title: orderItems.title,
        quantity: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPriceMinor})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(counted)
      .groupBy(orderItems.title)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5);

    // tax on shipping is part of o.tax; carve it out of items in proportion
    const itemTax = o.paid > 0 ? Math.round((o.tax * o.gross) / o.paid) : 0;
    const netSales = o.gross - o.discounts - r.refunded - itemTax;
    const totalRevenue = o.paid - r.refunded;
    return {
      currency,
      orders: o.orders,
      grossSales: o.gross,
      discounts: o.discounts,
      refunds: r.refunded,
      tax: o.tax,
      shipping: o.shipping,
      netSales,
      totalRevenue,
      costOfGoods: c.cost,
      grossProfit: c.missing > 0 ? null : netSales - c.cost,
      aov: o.orders ? Math.round(totalRevenue / o.orders) : 0,
      bestSellers: best,
    };
  });
}

/** Organisation roll-up: one total per currency, never mixed (§3.6). */
export async function orgReport<S extends { id: string; currency: string }>(shopList: S[], days: number) {
  const perShop = await Promise.all(
    shopList.map(async (s) => ({ shop: s, report: await shopReport(s.id, s.currency, days) })),
  );
  const byCurrency = new Map<string, { orders: number; totalRevenue: number; netSales: number }>();
  for (const { report } of perShop) {
    const t = byCurrency.get(report.currency) ?? { orders: 0, totalRevenue: 0, netSales: 0 };
    t.orders += report.orders;
    t.totalRevenue += report.totalRevenue;
    t.netSales += report.netSales;
    byCurrency.set(report.currency, t);
  }
  return { perShop, totals: [...byCurrency].map(([currency, t]) => ({ currency, ...t })) };
}
