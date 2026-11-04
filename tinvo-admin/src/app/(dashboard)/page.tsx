import type { Metadata } from "next";
import Link from "next/link";
import { orgsManagedBy, shopsFor } from "@/core/access";
import { orgReport } from "@/core/reports";
import { requireUser } from "@/core/session";
import { formatMinor } from "@/lib/india";

export const metadata: Metadata = { title: "Shops" };

/** Organisation view: only the shops this user may open. */
export default async function OrgDashboard() {
  const user = await requireUser();
  const [shops, orgs] = await Promise.all([shopsFor(user.id), orgsManagedBy(user.id)]);
  const canCreate = orgs.length > 0;
  const roll = await orgReport(shops, 30);

  return (
    <>
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="label text-dim">Organisation</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Shops</h1>
        </div>
        {canCreate && (
          <Link href="/shops/new" className="button">
            New shop
          </Link>
        )}
      </div>

      {shops.length === 0 ? (
        <div className="mt-10 border hairline p-10 text-center">
          <p className="text-[17px]">No shops yet.</p>
          <p className="mt-2 text-[14px] text-ash">
            {canCreate
              ? "Create your first shop to start managing its catalogue and orders."
              : "Ask an organisation owner to add you to a shop."}
          </p>
        </div>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="label text-ash">Last 30 days · all your shops</h2>
            <dl className="mt-4 grid gap-px bg-chalk/10 sm:grid-cols-3">
              {roll.totals.length === 0 ? (
                <div className="bg-void p-5 text-[14px] text-dim sm:col-span-3">No paid orders yet.</div>
              ) : (
                roll.totals.flatMap((t) => [
                  <div key={`${t.currency}-o`} className="bg-void p-5">
                    <dt className="label text-dim">Orders</dt>
                    <dd className="mt-2 text-xl tabular-nums">{t.orders}</dd>
                  </div>,
                  <div key={`${t.currency}-r`} className="bg-void p-5">
                    <dt className="label text-dim">Total revenue · {t.currency}</dt>
                    <dd className="mt-2 text-xl tabular-nums">{formatMinor(t.totalRevenue, t.currency)}</dd>
                  </div>,
                  <div key={`${t.currency}-n`} className="bg-void p-5">
                    <dt className="label text-dim">Net sales · {t.currency}</dt>
                    <dd className="mt-2 text-xl tabular-nums">{formatMinor(t.netSales, t.currency)}</dd>
                  </div>,
                ])
              )}
            </dl>
          </section>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roll.perShop.map(({ shop: s, report }) => (
              <li key={s.id} className="border hairline">
                <Link href={`/s/${s.id}`} className="block p-6 hover:bg-panel">
                  <p className="text-[19px]">{s.name}</p>
                  <p className="label mt-3 text-dim">/{s.slug}</p>
                  <p className="mt-5 text-[14px] text-ash">
                    {report.orders} orders · {formatMinor(report.totalRevenue, report.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
