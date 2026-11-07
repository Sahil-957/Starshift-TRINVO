import type { Metadata } from "next";
import Link from "next/link";
import { listApiKeys } from "@/core/apikeys";
import { listProducts } from "@/core/catalogue";
import { configuredProviders } from "@/core/credentials";
import { listOrdersForShop } from "@/core/orders";
import { shopReport } from "@/core/reports";
import { getShop } from "@/core/settings";
import { formatMinor } from "@/lib/india";
import { StatusBadge } from "./orders/status";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopOverview({ params }: PageProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const shop = await getShop(shopId);
  const [providers, keys, productList, recent, report] = await Promise.all([
    configuredProviders(shopId),
    listApiKeys(shopId),
    listProducts(shopId),
    listOrdersForShop(shopId),
    shopReport(shopId, shop.settlementCurrency, 30),
  ]);
  const has = (p: string) => providers.some((x) => x.provider === p);
  const money = (m: number) => formatMinor(m, shop.settlementCurrency);

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
