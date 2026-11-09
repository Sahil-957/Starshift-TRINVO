import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkoutEnabled } from "@/lib/admin-api";
import { currentAccount, safeNext } from "@/lib/account";
import { signInAction } from "../actions";
import AuthLayout from "../auth-layout";
import { AccountForm, Field, PasswordField } from "../form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignIn({ searchParams }: PageProps<"/account/sign-in">) {
  if (!checkoutEnabled) notFound();
  const q = await searchParams;
  const next = safeNext(q.next);
  if (await currentAccount()) redirect(next);
  return (
    <AuthLayout mode="sign-in" next={next} error={typeof q.error === "string" ? q.error : undefined}>
      <AccountForm action={signInAction} submit="Sign in" busy="Signing in…" wide>
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" autoFocus />
        <PasswordField
          label="Password"
          name="password"
          required
          autoComplete="current-password"
          aside={
            <Link href="/account/forgot" className="text-[13px] text-ash underline underline-offset-4 hover:text-chalk">
              Forgot password?
            </Link>
          }
        />
      </AccountForm>
    </AuthLayout>
  );
}
