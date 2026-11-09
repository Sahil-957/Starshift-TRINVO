import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkoutEnabled } from "@/lib/admin-api";
import { currentAccount, safeNext } from "@/lib/account";
import { signInAction } from "../actions";
import { AccountForm, Field } from "../form";
import Shell from "../shell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignIn({ searchParams }: PageProps<"/account/sign-in">) {
  if (!checkoutEnabled) notFound();
  const next = safeNext((await searchParams).next);
  if (await currentAccount()) redirect(next);
  const withNext = (path: string) => (next !== "/account" ? `${path}?next=${encodeURIComponent(next)}` : path);
  return (
    <Shell title="Sign in" lede="See all your orders and check out faster.">
      <AccountForm action={signInAction} submit="Sign in" busy="Signing in…">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      </AccountForm>
      <p className="mt-6 text-[14px]">
        <Link href="/account/forgot" className="text-ash underline underline-offset-4 hover:text-chalk">
          Forgot your password?
        </Link>
      </p>
      <div className="mt-12 grid gap-3 border-t hairline pt-8 text-[14px] text-ash">
        <p>
          New here?{" "}
          <Link href={withNext("/account/sign-up")} className="text-chalk underline underline-offset-4">
            Create an account
          </Link>
        </p>
        <p>
          Bought without an account?{" "}
          <Link href="/order" className="text-chalk underline underline-offset-4">
            Track an order
          </Link>
        </p>
      </div>
    </Shell>
  );
}
