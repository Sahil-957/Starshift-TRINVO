import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CheckoutForm from "./form";
import Link from "next/link";
import { checkoutEnabled } from "@/lib/admin-api";
import { currentAccount } from "@/lib/account";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  if (!checkoutEnabled) notFound();
  // set when PayU's reply couldn't be verified
  const error = (await searchParams).error;
  const me = await currentAccount();
  const a = me?.lastAddress;
  const prefill = me && { name: a?.name ?? me.customer.name, email: me.customer.email, phone: a?.phone ?? "", line1: a?.line1 ?? "", line2: a?.line2 ?? "", city: a?.city ?? "", state: a?.state ?? "", pin: a?.pin ?? "" };
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <h1 className="display text-[clamp(2.5rem,6vw,4rem)] text-chalk">Checkout</h1>
      <p className="mt-4 text-[14px] text-ash">
        {me ? (
          <>Signed in as {me.customer.email}. Your details are filled in; change anything you need.</>
        ) : (
          <>
            Have an account?{" "}
            <Link href="/account/sign-in?next=/checkout" className="text-chalk underline underline-offset-4">
              Sign in
            </Link>{" "}
            to fill in your details. Or just check out as a guest.
          </>
        )}
      </p>
      <CheckoutForm prefill={prefill || undefined} returnError={typeof error === "string" ? error.slice(0, 200) : undefined} />
    </div>
  );
}
