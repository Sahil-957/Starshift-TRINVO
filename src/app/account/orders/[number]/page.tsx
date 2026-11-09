import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import OrderDetail, { type OrderView } from "@/components/OrderDetail";
import { checkoutEnabled } from "@/lib/admin-api";
import { accountCall } from "@/lib/account";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function AccountOrder({ params }: PageProps<"/account/orders/[number]">) {
  if (!checkoutEnabled) notFound();
  const { number } = await params;
  let order: OrderView | null = null;
  let signedIn = true;
  try {
    const r = await accountCall("order", { number: decodeURIComponent(number).slice(0, 20) });
    order = r.data.order ?? null;
    signedIn = r.ok && r.data.signedIn === true;
  } catch {
    signedIn = false;
  }
  if (!signedIn) redirect(`/account/sign-in?next=${encodeURIComponent(`/account/orders/${number}`)}`);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <Link href="/account" className="label text-ash hover:text-chalk">
        ← All orders
      </Link>
      <div className="mt-8">
        <OrderDetail order={order} />
      </div>
    </div>
  );
}
