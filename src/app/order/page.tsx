import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminFetch, checkoutEnabled } from "@/lib/admin-api";
import ClearCart from "./clear-cart";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

type Order = {
  number: string;
  status: string;
  placedAt: string;
  totalMinor: number;
  courier: string | null;
  awb: string | null;
  trackingUrl: string | null;
  deliveredAt: string | null;
  items: { title: string; quantity: number }[];
};

const steps = [
  ["paid", "Paid"],
  ["in_production", "Printing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
] as const;

const say: Record<string, string> = {
  pending_payment: "Waiting for payment. If you paid, this updates within a few minutes.",
  paid: "Paid. Your tumbler is queued for printing.",
  in_production: "Being printed and packed.",
  shipped: "On its way.",
  delivered: "Delivered. Enjoy it.",
  cancelled: "This order was cancelled.",
  refunded: "This order was refunded.",
  returned: "This order was returned.",
};

export default async function OrderPage({ searchParams }: PageProps<"/order">) {
  if (!checkoutEnabled) notFound();
  const q = await searchParams;
  const number = String(q.number ?? "").slice(0, 20);
  const email = String(q.email ?? "").slice(0, 200);

  let order: Order | null = null;
  let error: string | null = null;
  if (number && email) {
    try {
      const res = await adminFetch(`/orders?number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.order) order = data.order;
      else error = data.error ?? "We couldn't look that up right now.";
    } catch {
      error = "We couldn't look that up right now. Please try again in a minute.";
    }
  }
  const reached = order ? steps.findIndex(([s]) => s === order.status) : -1;

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <h1 className="display text-[clamp(2.5rem,6vw,4rem)] text-chalk">{order ? `Order ${order.number}` : "Track your order"}</h1>

      {order ? (
        <>
          {q.placed && order.status !== "pending_payment" && (
            <>
              <ClearCart />
              <p className="mt-6 border border-chalk/40 p-5 text-[15px] text-chalk">
                Thank you! Your order is placed and paid. Keep your order number: you can track it on this page any time.
              </p>
            </>
          )}
          {q.failed && order.status === "pending_payment" && (
            <p role="alert" className="mt-6 border border-rose/50 p-5 text-[15px] text-chalk">
              The payment didn&apos;t go through, so you haven&apos;t been charged for this order. Your cart is still saved:{" "}
              <a href="/checkout" className="underline underline-offset-4">
                try again
              </a>
              .
            </p>
          )}
          <p className="mt-6 text-[17px] text-chalk">{say[order.status] ?? order.status}</p>
          {reached >= 0 && (
            <ol className="mt-8 grid grid-cols-4 gap-2">
              {steps.map(([s, label], i) => (
                <li key={s} className={`border-t-2 pt-3 ${i <= reached ? "border-chalk text-chalk" : "border-chalk/15 text-dim"}`}>
                  <span className="label">{label}</span>
                </li>
              ))}
            </ol>
          )}
          {order.trackingUrl && (
            <p className="mt-8 text-[15px] text-ash">
              {order.courier} · AWB {order.awb} ·{" "}
              <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-chalk underline underline-offset-4">
                Track the parcel ↗
              </a>
            </p>
          )}
          <ul className="mt-10 border-t hairline">
            {order.items.map((i) => (
              <li key={i.title} className="flex justify-between border-b hairline py-3 text-[15px]">
                <span className="text-chalk">{i.title}</span>
                <span className="text-ash">× {i.quantity}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-right font-mono text-chalk">
            Total ₹{(order.totalMinor / 100).toLocaleString("en-IN")}
          </p>
        </>
      ) : (
        <form className="mt-10 grid gap-5" method="get">
          {error && (
            <p role="alert" className="text-[14px] text-rose">
              {error}
            </p>
          )}
          <label className="grid gap-2">
            <span className="label text-dim">Order number</span>
            <input name="number" required defaultValue={number} placeholder="TNV-1001" className="w-full border hairline bg-transparent px-4 py-3 text-chalk outline-none focus:border-chalk" />
          </label>
          <label className="grid gap-2">
            <span className="label text-dim">Email used for the order</span>
            <input name="email" type="email" required defaultValue={email} className="w-full border hairline bg-transparent px-4 py-3 text-chalk outline-none focus:border-chalk" />
          </label>
          <button type="submit" className="label justify-self-start bg-chalk px-10 py-4 text-void">
            Find my order
          </button>
        </form>
      )}
    </div>
  );
}
