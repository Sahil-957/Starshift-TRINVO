import type { Metadata } from "next";
import Link from "next/link";
import { listApiKeys } from "@/core/apikeys";
import { listProducts } from "@/core/catalogue";
import { configuredProviders, getCredentials } from "@/core/credentials";
import { attentionCounts, listOrdersForShop } from "@/core/orders";
import { shopReport } from "@/core/reports";
import { pendingReviewCount } from "@/core/reviews";
import { getShop, getShopState } from "@/core/settings";
import { formatMinor } from "@/lib/india";
import { StatusBadge } from "./orders/status";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopOverview({ params }: PageProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const shop = await getShop(shopId);
  const [providers, keys, productList, recent, report, attention, state, payu, qikink, waitingReviews] = await Promise.all([
    configuredProviders(shopId),
    listApiKeys(shopId),
    listProducts(shopId),
    listOrdersForShop(shopId),
    shopReport(shopId, shop.settlementCurrency, 30),
    attentionCounts(shopId),
    getShopState(shopId),
    getCredentials(shopId, "payu"),
    getCredentials(shopId, "qikink"),
    pendingReviewCount(shopId),
  ]);
  const has = (p: string) => providers.some((x) => x.provider === p);
  const money = (m: number) => formatMinor(m, shop.settlementCurrency);
  const orders = `/s/${shopId}/orders`;

  // what needs a person, most urgent first
  const alerts = [
    attention.notSent > 0 && {
      tone: "text-rose",
      text: `${attention.notSent} paid order${attention.notSent === 1 ? "" : "s"} not sent to Qikink`,
      hint: "Open the order to see why, then click Try again.",
      href: `${orders}?status=paid`,
    },
    state.lastSync?.error && {
      tone: "text-rose",
      text: "The last Qikink sync failed",
      hint: state.lastSync.error,
      href: orders,
    },
    attention.sending > 0 && {
      tone: "text-bronze",
      text: `${attention.sending} paid order${attention.sending === 1 ? "" : "s"} waiting to go to Qikink`,
      hint: "Usually sent within seconds; if it stays here, open the order.",
      href: `${orders}?status=paid`,
    },
    waitingReviews > 0 && {
      tone: "text-bronze",
      text: `${waitingReviews} review${waitingReviews === 1 ? "" : "s"} waiting to be published`,
      hint: "Read them and publish the ones you want on the website.",
      href: `/s/${shopId}/reviews`,
    },
    attention.unpaid > 0 && {
      tone: "text-ash",
      text: `${attention.unpaid} unpaid checkout${attention.unpaid === 1 ? "" : "s"} in the last 7 days`,
      hint: "Customers who left at the payment page. Payments that went through are picked up automatically.",
      href: `${orders}?status=pending_payment`,
    },
  ].filter(Boolean) as { tone: string; text: string; hint: string; href: string }[];

  const status = [
    ["Payments (PayU)", payu ? (payu.env === "live" ? "Live" : "Test mode") : "Not connected", payu?.env === "live"],
    ["Printing (Qikink)", qikink ? (qikink.env === "live" ? "Live" : "Sandbox") : "Not connected", qikink?.env === "live"],
    [
      "Order sync",
      state.lastSync ? `${ago(state.lastSync.at)}${state.lastSync.error ? " · failed" : ""}` : "Not run yet",
      Boolean(state.lastSync && !state.lastSync.error),
    ],
    ["Website published", state.lastPublishedAt ? ago(state.lastPublishedAt) : "Not from the admin yet", Boolean(state.lastPublishedAt)],
  ] as const;

  const checklist = [
    ["Add products", productList.some((p) => p.status === "active"), `/s/${shopId}/products`],
    ["Connect Qikink", has("qikink"), `/s/${shopId}/settings#integrations`],
    ["Connect PayU", has("payu"), `/s/${shopId}/settings#integrations`],
    ["Create a storefront token", keys.length > 0, `/s/${shopId}/settings#storefront`],
    ["Add GSTIN and origin state", Boolean(shop.gstin && shop.originState), `/s/${shopId}/settings`],
  ] as const;
  const todo = checklist.filter(([, done]) => !done);

  return (
    <div className="grid gap-10">
      {todo.length > 0 && (
        <section className="border hairline p-6">
          <h2 className="label text-ash">Set up · {checklist.length - todo.length}/{checklist.length} done</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map(([label, done, href]) => (
              <li key={label} className="text-[14px]">
                <span className={done ? "text-dim line-through" : ""}>
                  {done ? "✓ " : "○ "}
                  {done ? label : <Link href={href} className="underline underline-offset-4 hover:text-chalk">{label}</Link>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="label text-ash">Needs attention</h2>
        {alerts.length === 0 ? (
          <p className="mt-4 border hairline p-5 text-[14px] text-ash">✓ Nothing needs you right now.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {alerts.map((a) => (
              <li key={a.text}>
                <Link href={a.href} className="block border hairline p-5 hover:bg-panel">
                  <p className={`text-[15px] ${a.tone}`}>{a.text} →</p>
                  <p className="mt-1 break-words text-[13px] text-dim">{a.hint}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="label text-ash">System status</h2>
        <dl className="mt-4 grid gap-px bg-chalk/10 sm:grid-cols-2 lg:grid-cols-4">
          {status.map(([k, v, ok]) => (
            <div key={k} className="bg-void p-5">
              <dt className="label text-dim">{k}</dt>
              <dd className={`mt-2 text-[15px] ${ok ? "text-chalk" : "text-bronze"}`}>
                {ok ? "● " : "○ "}
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="label text-ash">Last 30 days</h2>
        <dl className="mt-4 grid gap-px bg-chalk/10 sm:grid-cols-4">
          {[
            ["Orders", String(report.orders)],
            ["Total revenue", money(report.totalRevenue)],
            ["Net sales", money(report.netSales)],
            ["Avg. order", money(report.aov)],
          ].map(([k, v]) => (
            <div key={k} className="bg-void p-5">
              <dt className="label text-dim">{k}</dt>
              <dd className="mt-2 text-xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="label text-ash">Recent orders</h2>
          <Link href={`/s/${shopId}/orders`} className="label text-dim hover:text-chalk">
            All orders →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 border hairline p-6 text-[14px] text-dim">No orders yet. They appear here as soon as someone checks out.</p>
        ) : (
          <ul className="mt-4 border-t hairline">
            {recent.slice(0, 6).map((o) => (
              <li key={o.id} className="border-b hairline">
                <Link href={`/s/${shopId}/orders/${o.id}`} className="flex items-center gap-4 py-3 text-[14px] hover:bg-panel">
                  <span className="w-24 font-mono">{o.number}</span>
                  <span className="flex-1 truncate text-ash">{o.customerName}</span>
                  <StatusBadge status={o.status} />
                  <span className="w-28 text-right tabular-nums">{money(o.totalMinor)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** "just now", "12 min ago", "3 h ago", "2 days ago" */
function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
