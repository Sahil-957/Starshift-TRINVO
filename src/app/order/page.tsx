import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminFetch, checkoutEnabled } from "@/lib/admin-api";
import ClearCart from "./clear-cart";
import Link from "next/link";
import { currentAccount } from "@/lib/account";
import { EmailMyOrders } from "./email-orders";
import OrderDetail, { type OrderView } from "@/components/OrderDetail";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

export default async function OrderPage({ searchParams }: PageProps<"/order">) {
  if (!checkoutEnabled) notFound();
  const q = await searchParams;
  const number = String(q.number ?? "").slice(0, 20);
  const email = String(q.email ?? "").slice(0, 200);

  let order: OrderView | null = null;
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
  const signedIn = order ? !!(await currentAccount()) : false;

  return (
    <div className={`mx-auto px-5 py-16 sm:px-8 ${order ? "max-w-5xl" : "max-w-2xl"}`}>
      {!order && <h1 className="display text-[clamp(2.5rem,6vw,4rem)] text-chalk">Track your order</h1>}

      {order ? (
        <>
          {q.placed && order.status !== "pending_payment" && (
            <>
              <ClearCart />
              <p className="mb-2 border border-jade/40 bg-jade/5 p-5 text-[15px] text-chalk">
                Thank you! Your order is placed and paid. Keep your order number: you can track it on this page any time.
              </p>
            </>
          )}
          {q.failed && order.status === "pending_payment" && (
            <p role="alert" className="mb-2 border border-rose/50 p-5 text-[15px] text-chalk">
              The payment didn&apos;t go through, so you haven&apos;t been charged for this order. Your cart is still saved:{" "}
              <a href="/checkout" className="underline underline-offset-4">
                try again
              </a>
              .
            </p>
          )}
          <div className={q.placed || q.failed ? "mt-10" : ""}>
            <OrderDetail order={order} />
          </div>
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
      {!order && <EmailMyOrders />}
      {order && !signedIn && (
        <section className="mt-12 border hairline p-6 sm:p-8">
          <h2 className="text-[17px] text-chalk">All your orders in one place</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ash">
            Create an account with {email.trim().toLowerCase()} to see this order and every future one, and check out faster next time.
          </p>
          <Link
            href={`/account/sign-up?email=${encodeURIComponent(email.trim())}`}
            className="label mt-5 inline-block bg-chalk px-7 py-4 text-void transition-colors hover:bg-bronze"
          >
            Create an account
          </Link>
        </section>
      )}
      {!order && (
        <p className="mt-10 text-[14px] text-ash">
          Have an account?{" "}
          <Link href="/account" className="text-chalk underline underline-offset-4">
            See all your orders
          </Link>
        </p>
      )}
    </div>
  );
}
