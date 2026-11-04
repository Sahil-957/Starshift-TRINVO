import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CartView from "./view";
import { checkoutEnabled } from "@/lib/admin-api";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  if (!checkoutEnabled) notFound();
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="display text-[clamp(2.5rem,6vw,4rem)] text-chalk">Your cart</h1>
      <CartView />
    </div>
  );
}
