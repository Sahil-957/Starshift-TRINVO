import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkoutEnabled } from "@/lib/admin-api";
import { currentAccount, safeNext } from "@/lib/account";
import { signUpAction } from "../actions";
import { AccountForm, Field } from "../form";
import Shell from "../shell";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignUp({ searchParams }: PageProps<"/account/sign-up">) {
  if (!checkoutEnabled) notFound();
  const q = await searchParams;
  const next = safeNext(q.next);
  if (await currentAccount()) redirect(next);
  const email = typeof q.email === "string" ? q.email.slice(0, 200) : "";
  return (
    <Shell
      title="Create an account"
      lede="Every order you've placed with your email, past and future, in one place. And faster checkout next time."
    >
      <AccountForm action={signUpAction} submit="Create account" busy="Creating…">
        <input type="hidden" name="next" value={next} />
        <Field label="Your name" name="name" required maxLength={80} autoComplete="name" />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          defaultValue={email}
          autoComplete="email"
          hint="Use the one you order with. We'll email you a link to confirm it's yours."
        />
        <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" hint="At least 8 characters." />
      </AccountForm>
      <p className="mt-12 border-t hairline pt-8 text-[14px] text-ash">
        Already have one?{" "}
        <Link href={next !== "/account" ? `/account/sign-in?next=${encodeURIComponent(next)}` : "/account/sign-in"} className="text-chalk underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </Shell>
  );
}
