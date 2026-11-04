import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm, { Field } from "../../../../action-form";
import { cancelAction, refundAction, retryFulfilmentAction } from "../../actions";
import { getOrderDetail } from "@/core/orders";
import { requireShop } from "@/core/session";
import { formatMinor, STATES } from "@/lib/india";
import { StatusBadge } from "../status";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/s/[shopId]/orders/[orderId]">) {
  const { shopId, orderId } = await params;
  const { role } = await requireShop(shopId, "view");
  const d = await getOrderDetail(shopId, orderId);
  if (!d) notFound();
  const { order: o, items, tax, events } = d;
  const money = (m: number) => formatMinor(m, o.currency);
  const canManage = role !== "staff";
  const canRefund = (role === "owner" || role === "admin") && ["paid", "in_production", "shipped", "delivered"].includes(o.status);
  const a = o.shippingAddress;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="grid content-start gap-10">
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/s/${shopId}/orders`} className="label text-dim hover:text-chalk">
            ← Orders
          </Link>
          <h2 className="font-mono text-2xl">{o.number}</h2>
          <StatusBadge status={o.status} />
        </div>

        {o.fulfilmentError && (
          <div role="alert" className="border border-rose/50 p-5">
            <p className="label text-rose">Not sent to Qikink</p>
            <p className="mt-2 text-[14px]">{o.fulfilmentError}</p>
            {canManage && (
              <div className="mt-4">
                <ActionForm action={retryFulfilmentAction.bind(null, shopId, o.id)} submit="Try again" tone="quiet" />
              </div>
            )}
          </div>
        )}

        <section>
          <h3 className="label text-ash">Items</h3>
          <table className="mt-3 w-full text-[14px]">
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b hairline">
                  <td className="py-3">{i.title}</td>
                  <td className="text-ash">× {i.quantity}</td>
                  <td className="text-right tabular-nums">{money(i.unitPriceMinor * i.quantity)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 text-ash" colSpan={2}>Subtotal</td>
                <td className="pt-3 text-right tabular-nums">{money(o.subtotalMinor)}</td>
              </tr>
              <tr>
                <td className="text-ash" colSpan={2}>Shipping</td>
                <td className="text-right tabular-nums">{o.shippingMinor ? money(o.shippingMinor) : "Free"}</td>
              </tr>
              {tax.map((t) => (
                <tr key={t.id} className="text-dim">
                  <td colSpan={2}>
                    incl. {t.kind.toUpperCase()} {t.rateBps / 100}% on {money(t.taxableMinor)}
                  </td>
                  <td className="text-right tabular-nums">{money(t.amountMinor)}</td>
                </tr>
              ))}
              <tr className="text-[16px]">
                <td className="pt-3" colSpan={2}>Total</td>
                <td className="pt-3 text-right tabular-nums">{money(o.totalMinor)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="label text-ash">Timeline</h3>
          <ol className="mt-3 border-l hairline">
            {events.map((e) => (
              <li key={e.id} className="relative py-2 pl-5 text-[14px]">
                <span className="absolute -left-[3px] top-[14px] h-1.5 w-1.5 rounded-full bg-ash" />
                <span>{e.type.replace(".", " · ")}</span>
                <span className="ml-3 text-[12px] text-dim">
                  {e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                {e.data != null && <pre className="mt-1 whitespace-pre-wrap break-all text-[12px] text-dim">{JSON.stringify(e.data)}</pre>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="grid content-start gap-6 text-[14px]">
        <section className="border hairline p-5">
          <h3 className="label text-ash">Customer</h3>
          <p className="mt-3">{o.customerName}</p>
          <p className="text-ash">{o.email}</p>
          <p className="text-ash">{o.phone}</p>
          <p className="mt-3 text-ash">
            {a.line1}
            {a.line2 && <><br />{a.line2}</>}
            <br />
            {a.city}, {STATES[a.state] ?? a.state} {a.pin}
          </p>
        </section>

        <section className="border hairline p-5">
          <h3 className="label text-ash">Payment</h3>
          <p className="mt-3 break-all text-ash">Razorpay order {o.razorpayOrderId ?? "—"}</p>
          <p className="break-all text-ash">Payment {o.razorpayPaymentId ?? "not paid yet"}</p>
          {o.paidAt && <p className="text-ash">Paid {o.paidAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>}
        </section>

        <section className="border hairline p-5">
          <h3 className="label text-ash">Fulfilment · Qikink</h3>
          <p className="mt-3 text-ash">Qikink order {o.supplierOrderId ?? "—"}</p>
          <p className="text-ash">Status {o.supplierStatus ?? "—"}</p>
          {o.awb && (
            <p className="text-ash">
              {o.courier} · AWB {o.awb}
            </p>
          )}
          {o.trackingUrl && (
            <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-4">
              Track shipment ↗
            </a>
          )}
        </section>

        {canManage && o.status === "pending_payment" && (
          <ActionForm action={cancelAction.bind(null, shopId, o.id)} submit="Cancel order" tone="quiet" confirm="Cancel this unpaid order?" />
        )}
        {canRefund && (
          <section className="border border-rose/30 p-5">
            <h3 className="label text-rose">Refund</h3>
            <div className="mt-4">
              <ActionForm
                action={refundAction.bind(null, shopId, o.id)}
                submit={`Refund ${money(o.totalMinor)}`}
                tone="danger"
                confirm="Refund the full amount to the customer? This cannot be undone."
              >
                <Field label="Reason">
                  <input name="reason" maxLength={200} className="field" placeholder="Damaged in transit" />
                </Field>
              </ActionForm>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
