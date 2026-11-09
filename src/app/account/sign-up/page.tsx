import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { checkoutEnabled } from "@/lib/admin-api";
import { currentAccount, safeNext } from "@/lib/account";
import { signUpAction } from "../actions";
import AuthLayout from "../auth-layout";
import { AccountForm, Field, PasswordField } from "../form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignUp({ searchParams }: PageProps<"/account/sign-up">) {
  if (!checkoutEnabled) notFound();
  const q = await searchParams;
  const next = safeNext(q.next);
  if (await currentAccount()) redirect(next);
  const email = typeof q.email === "string" ? q.email.slice(0, 200) : "";
  return (
    <AuthLayout mode="sign-up" next={next}>
      <AccountForm action={signUpAction} submit="Create account" busy="Creating your account…" wide>
        <input type="hidden" name="next" value={next} />
        <Field label="Your name" name="name" required maxLength={80} autoComplete="name" autoFocus={!email} />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          defaultValue={email}
          autoComplete="email"
          inputMode="email"
          hint="Use the one you order with. We'll send a link to confirm it's yours."
        />
        <PasswordField label="Password" name="password" required minLength={8} autoComplete="new-password" hint="At least 8 characters." meter />
      </AccountForm>
    </AuthLayout>
  );
}
