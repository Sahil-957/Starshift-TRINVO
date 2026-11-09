import Image from "next/image";
import Link from "next/link";
import { getProduct } from "@/data/products";

/** One order as its buyer sees it (from the admin's customerOrderView). */
export type OrderView = {
  number: string;
  status: string;
  placedAt: string;
  items: { title: string; slug: string; quantity: number; unitPriceMinor: number }[];
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  taxMinor: number;
  tax: { kind: string; ratePercent: number; amountMinor: number }[];
  totalMinor: number;
  payment: { provider: string; reference: string | null; paidAt: string } | null;
  shipTo: { name: string; phone: string; lines: string[]; city: string; state: string; pin: string };
  courier: string | null;
  awb: string | null;
  trackingUrl: string | null;
  deliveredAt: string | null;
  timeline: { step: string; at: string }[];
};

const SUPPORT = "starshift07@gmail.com";
const ist = { timeZone: "Asia/Kolkata" } as const;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { ...ist, day: "numeric", month: "short", year: "numeric" });
const short = (d: Date) => d.toLocaleDateString("en-IN", { ...ist, day: "numeric", month: "short" });
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { ...ist, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const rupees = (minor: number) => `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: minor % 100 ? 2 : 0 })}`;

const progress = [
  ["paid", "Paid"],
  ["printing", "Printing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
] as const;
const statusStep: Record<string, number> = { paid: 0, in_production: 1, shipped: 2, delivered: 3 };

const headline: Record<string, [string, string]> = {
  pending_payment: ["Waiting for payment", "If you've paid, this updates within a few minutes."],
  paid: ["Order confirmed", "Your payment is in. Your tumbler is queued for printing."],
  in_production: ["Being printed", "Your design is being printed onto your tumbler, then packed for the courier."],
  shipped: ["On its way", "Your parcel is with the courier. Use the tracking link for live updates."],
  delivered: ["Delivered", "Your order has been delivered. Enjoy it!"],
  cancelled: ["Cancelled", "This order was cancelled. Any payment is refunded to the original method."],
  refunded: ["Refunded", "This order was refunded to your original payment method. Banks usually take 5–7 working days."],
  returned: ["Returned", "This order was returned."],
};

const stepLabel: Record<string, string> = {
  placed: "Order placed",
  paid: "Payment received",
  printing: "Sent for printing",
  shipped: "Handed to the courier",
  delivered: "Delivered",
  cancelled: "Order cancelled",
  refunded: "Refund issued",
};

/** Dispatch within 2 working days, then 2–7 days in transit (see the Shipping page). */
function estimate(o: OrderView) {
  if (!["paid", "in_production", "shipped"].includes(o.status)) return null;
  const from = new Date(o.payment?.paidAt ?? o.placedAt);
  const add = (d: number) => new Date(from.getTime() + d * 86_400_000);
  return `${short(add(4))} – ${short(add(10))}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border hairline p-5 sm:p-6">
      <h2 className="label text-dim">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function OrderDetail({ order: o }: { order: OrderView }) {
  const [title, line] = headline[o.status] ?? [o.status, ""];
  const reached = statusStep[o.status] ?? -1;
  const at = (step: string) => o.timeline.find((t) => t.step === step)?.at;
  const eta = estimate(o);
  const gst = o.tax.reduce((s, t) => s + t.amountMinor, 0) || o.taxMinor;
  const rates = [...new Set(o.tax.map((t) => t.ratePercent))];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="label text-dim">Order</p>
          <h1 className="display mt-2 text-[clamp(2.25rem,6vw,3.5rem)] text-chalk">{o.number}</h1>
        </div>
        <p className="text-[14px] text-ash">Placed {when(o.placedAt)}</p>
      </div>

      {/* status */}
      <section className="mt-8 border hairline p-5 sm:p-7">
        <p className="text-[20px] text-chalk">{title}</p>
        <p className="mt-1 text-[15px] text-ash">{line}</p>
        {reached >= 0 && (
          <ol className="mt-7 grid grid-cols-4 gap-2" aria-label={`Progress: ${progress[reached][1]}`}>
            {progress.map(([step, label], i) => {
              const done = i <= reached;
              const date = at(step);
              return (
                <li key={step} className={`border-t-2 pt-3 ${done ? "border-chalk" : "border-chalk/15"}`}>
                  <p className={`label text-[10px] sm:text-[11px] ${done ? "text-chalk" : "text-dim"}`}>{label}</p>
                  <p className="mt-1 text-[12px] text-dim">{done && date ? short(new Date(date)) : " "}</p>
                </li>
              );
            })}
          </ol>
        )}

        {o.trackingUrl ? (
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t hairline pt-6">
            <div className="text-[14px]">
              <p className="text-chalk">{o.courier ?? "Courier"}</p>
              {o.awb && <p className="mt-1 font-mono text-ash">AWB {o.awb}</p>}
            </div>
            <a
              href={o.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="label bg-chalk px-6 py-3.5 text-void transition-colors hover:bg-bronze"
            >
              Track parcel ↗
            </a>
          </div>
        ) : (
          eta && (
            <div className="mt-7 flex flex-wrap items-baseline justify-between gap-2 border-t hairline pt-6 text-[14px]">
              <p className="text-ash">Estimated delivery</p>
              <p className="text-chalk">{eta}</p>
              <p className="w-full text-[13px] text-dim">
                The courier and tracking link appear here, and in an email, the moment it ships.
              </p>
            </div>
          )
        )}
        {o.deliveredAt && <p className="mt-6 border-t hairline pt-6 text-[14px] text-ash">Delivered on {when(o.deliveredAt)}.</p>}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid h-fit gap-6">
          {/* items + money */}
          <Card title={`Items (${o.items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="grid gap-4">
              {o.items.map((i) => {
                const p = getProduct(i.slug);
                return (
                  <li key={i.slug} className="flex items-center gap-4">
                    <span className="relative block h-20 w-16 shrink-0 overflow-hidden bg-chalk/5">
                      {p?.images[0] && <Image src={`/products/${p.images[0].file}`} alt="" fill sizes="64px" className="object-cover" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {p ? (
                        <Link href={`/shop/${i.slug}`} className="text-[15px] text-chalk hover:underline">
                          {i.title}
                        </Link>
                      ) : (
                        <p className="text-[15px] text-chalk">{i.title}</p>
                      )}
                      <p className="mt-1 text-[13px] text-dim">
                        20 oz tumbler · {i.quantity} × {rupees(i.unitPriceMinor)}
                      </p>
                    </div>
                    <p className="font-mono text-[14px] text-chalk">{rupees(i.unitPriceMinor * i.quantity)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-6 grid gap-2 border-t hairline pt-5 text-[14px]">
              <div className="flex justify-between text-ash">
                <dt>Subtotal</dt>
                <dd className="font-mono">{rupees(o.subtotalMinor)}</dd>
              </div>
              <div className="flex justify-between text-ash">
                <dt>Shipping</dt>
                <dd className="font-mono">{o.shippingMinor ? rupees(o.shippingMinor) : "Free"}</dd>
              </div>
              {o.discountMinor > 0 && (
                <div className="flex justify-between text-ash">
                  <dt>Discount</dt>
                  <dd className="font-mono">−{rupees(o.discountMinor)}</dd>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t hairline pt-3 text-[16px] text-chalk">
                <dt>{o.payment ? "Total paid" : "Total"}</dt>
                <dd className="font-mono">{rupees(o.totalMinor)}</dd>
              </div>
              <p className="text-right text-[12px] text-dim">
                {gst > 0 ? `Includes ${rupees(gst)} GST${rates.length === 1 ? ` (${rates[0]}%)` : ""}` : "Prices include GST"}
              </p>
            </dl>
          </Card>

          {/* activity */}
          <Card title="Activity">
            <ol className="relative grid gap-5 border-l border-chalk/15 pl-5">
              {[...o.timeline].reverse().map((t) => (
                <li key={t.step} className="relative">
                  <span aria-hidden className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-chalk" />
                  <p className="text-[14px] text-chalk">{stepLabel[t.step] ?? t.step}</p>
                  <p className="text-[13px] text-dim">{when(t.at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="grid h-fit gap-6">
          <Card title="Delivery address">
            <address className="text-[14px] not-italic leading-relaxed text-ash">
              <span className="text-chalk">{o.shipTo.name}</span>
              <br />
              {o.shipTo.lines.map((l) => (
                <span key={l}>
                  {l}
                  <br />
                </span>
              ))}
              {o.shipTo.city}, {o.shipTo.state} {o.shipTo.pin}
              <br />
              Phone {o.shipTo.phone}
            </address>
            {o.shipTo.lines.length === 0 && (
              <p className="mt-3 text-[12px] text-dim">
                <Link href="/account" className="underline underline-offset-4">
                  Sign in
                </Link>{" "}
                to see the full address.
              </p>
            )}
          </Card>

          <Card title="Payment">
            {o.payment ? (
              <dl className="grid gap-1.5 text-[14px] text-ash">
                <div className="flex justify-between gap-4">
                  <dt>Paid with</dt>
                  <dd className="text-chalk">{o.payment.provider}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Paid on</dt>
                  <dd className="text-chalk">{day(o.payment.paidAt)}</dd>
                </div>
                {o.payment.reference && (
                  <div className="flex justify-between gap-4">
                    <dt>Payment ID</dt>
                    <dd className="font-mono text-chalk">{o.payment.reference}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-[14px] text-ash">Not paid yet.</p>
            )}
          </Card>

          <Card title="Need help?">
            <p className="text-[14px] leading-relaxed text-ash">
              Email us with your order number and we&apos;ll reply within a working day.
            </p>
            <a
              href={`mailto:${SUPPORT}?subject=${encodeURIComponent(`Order ${o.number}`)}`}
              className="label mt-4 inline-block border hairline px-5 py-3 text-chalk transition-colors hover:bg-chalk hover:text-void"
            >
              Email about this order
            </a>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
              <Link href="/support/shipping" className="text-ash underline underline-offset-4 hover:text-chalk">
                Shipping
              </Link>
              <Link href="/support/returns" className="text-ash underline underline-offset-4 hover:text-chalk">
                Returns &amp; refunds
              </Link>
              <Link href="/support/care" className="text-ash underline underline-offset-4 hover:text-chalk">
                Care
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
