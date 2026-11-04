import type { Metadata } from "next";
import Link from "next/link";
import { shopReport } from "@/core/reports";
import { getShop } from "@/core/settings";
import { formatMinor } from "@/lib/india";

export const metadata: Metadata = { title: "Reports" };

const periods = [7, 30, 90, 365];

export default async function ReportsPage({ params, searchParams }: PageProps<"/s/[shopId]/reports">) {
  const { shopId } = await params;
  const asked = Number((await searchParams).days);
  const days = periods.includes(asked) ? asked : 30;
  const shop = await getShop(shopId);
  const r = await shopReport(shopId, shop.settlementCurrency, days);
  const money = (m: number) => formatMinor(m, r.currency);

  const rows: [string, string, string][] = [
    ["Orders", String(r.orders), "Paid in the period"],
    ["Gross sales", money(r.grossSales), "Items as charged, tax included"],
    ["Discounts", money(r.discounts), ""],
    ["Refunds", money(r.refunds), "Refunded on orders paid in the period"],
    ["Tax collected", money(r.tax), "GST, including on shipping; not revenue"],
    ["Shipping", money(r.shipping), "Charged to customers"],
    ["Net sales", money(r.netSales), "Gross − discounts − refunds − tax on items"],
    ["Total revenue", money(r.totalRevenue), "What customers paid − refunds"],
    ["Cost of goods", money(r.costOfGoods), "From each product's cost at the time of sale"],
    ["Gross profit", r.grossProfit == null ? "—" : money(r.grossProfit), r.grossProfit == null ? "Some sold items have no cost entered" : "Net sales − cost of goods"],
    ["Average order", money(r.aov), "Total revenue ÷ orders"],
  ];

  return (
    <div className="grid gap-10">
      <nav className="flex gap-2">
        {periods.map((d) => (
          <Link
            key={d}
            href={`?days=${d}`}
            className={`label border px-3 py-2 ${d === days ? "border-chalk text-chalk" : "hairline text-dim hover:text-ash"}`}
          >
            {d === 365 ? "1 year" : `${d} days`}
          </Link>
        ))}
      </nav>

      {r.orders === 0 ? (
        <p className="border hairline p-8 text-center text-[14px] text-dim">No paid orders in the last {days} days.</p>
      ) : (
        <>
          <dl className="border-t hairline">
            {rows.map(([k, v, note]) => (
              <div key={k} className="grid grid-cols-[10rem_1fr] items-baseline gap-4 border-b hairline py-3 sm:grid-cols-[12rem_10rem_1fr]">
                <dt className="text-[14px]">{k}</dt>
                <dd className="text-right tabular-nums sm:text-left">{v}</dd>
                <dd className="col-span-2 text-[13px] text-dim sm:col-span-1">{note}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="label text-ash">Best sellers</h2>
            <ol className="mt-3 grid gap-2">
              {r.bestSellers.map((b, i) => (
                <li key={b.title} className="flex gap-4 text-[14px]">
                  <span className="w-5 text-dim">{i + 1}</span>
                  <span className="flex-1">{b.title}</span>
                  <span className="text-ash">{b.quantity} sold</span>
                  <span className="w-28 text-right tabular-nums">{money(b.revenue)}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
