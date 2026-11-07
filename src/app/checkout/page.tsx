import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CheckoutForm from "./form";
import { checkoutEnabled } from "@/lib/admin-api";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  if (!checkoutEnabled) notFound();
  // set when PayU's reply couldn't be verified
  const error = (await searchParams).error;
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <h1 className="display text-[clamp(2.5rem,6vw,4rem)] text-chalk">Checkout</h1>
      <CheckoutForm returnError={typeof error === "string" ? error.slice(0, 200) : undefined} />
    </div>
  );
}
