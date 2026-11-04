import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "../../../action-form";
import { syncAction } from "../actions";
import { listOrdersForShop } from "@/core/orders";
import { getShop } from "@/core/settings";
import { formatMinor } from "@/lib/india";
import { StatusBadge, statusLabel } from "./status";

export const metadata: Metadata = { title: "Orders" };

const filters = ["", "pending_payment", "paid", "in_production", "shipped", "delivered", "refunded", "cancelled"];

export default async function OrdersPage({ params, searchParams }: PageProps<"/s/[shopId]/orders">) {
  const { shopId } = await params;
  const status = String((await searchParams).status ?? "");
  const [shop, list] = await Promise.all([getShop(shopId), listOrdersForShop(shopId, filters.includes(status) ? status || undefined : undefined)]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav className="flex flex-wrap gap-2">
          {filters.map((s) => (
            <Link
              key={s}
              href={s ? `?status=${s}` : "?"}
              className={`label border px-3 py-2 ${s === status ? "border-chalk text-chalk" : "hairline text-dim hover:text-ash"}`}
            >
              {s ? statusLabel(s) : "All"}
            </Link>
          ))}
        </nav>
        <ActionForm action={syncAction.bind(null, shopId)} submit="Sync with Qikink" tone="quiet" className="flex items-center gap-3" />
      </div>

      {list.length === 0 ? (
        <p className="mt-8 border hairline p-8 text-center text-[14px] text-dim">No orders{status ? ` with status “${statusLabel(status)}”` : " yet"}.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="label text-dim">
              <tr className="border-b hairline">
                <th className="py-3 font-normal">Order</th>
                <th className="font-normal">Placed</th>
                <th className="font-normal">Customer</th>
                <th className="font-normal">Ship to</th>
                <th className="text-right font-normal">Status</th>
                <th className="text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-b hairline hover:bg-panel">
                  <td className="py-3 font-mono">
                    <Link href={`/s/${shopId}/orders/${o.id}`} className="underline-offset-4 hover:underline">
                      {o.number}
                    </Link>
                  </td>
                  <td className="text-ash">{o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td>{o.customerName}</td>
                  <td className="text-ash">
                    {o.shippingAddress.city}, {o.shippingAddress.state}
                  </td>
                  <td className="text-right">
                    <StatusBadge status={o.status} />
                    {o.fulfilmentError && <span className="label ml-2 text-rose">!</span>}
                  </td>
                  <td className="text-right tabular-nums">{formatMinor(o.totalMinor, shop.settlementCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
