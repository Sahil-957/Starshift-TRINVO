import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { checkoutEnabled } from "@/lib/admin-api";
import { forgotAction } from "../actions";
import { AccountForm, Field } from "../form";
import Shell from "../shell";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Forgot() {
  if (!checkoutEnabled) notFound();
  return (
    <Shell title="Forgot your password?" lede="Enter your account's email and we'll send you a link to choose a new one.">
      <AccountForm action={forgotAction} submit="Send reset link" busy="Sending…">
        <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" autoFocus />
      </AccountForm>
      <p className="mt-8 text-[14px]">
        <Link href="/account/sign-in" className="text-ash underline underline-offset-4 hover:text-chalk">
          Back to sign in
        </Link>
      </p>
    </Shell>
  );
}
