import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { checkoutEnabled } from "@/lib/admin-api";
import { resetAction } from "../actions";
import { AccountForm, Field } from "../form";
import Shell from "../shell";

// no-referrer: the token in the address must not leak to other sites
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function Reset({ searchParams }: PageProps<"/account/reset">) {
  if (!checkoutEnabled) notFound();
  const token = String((await searchParams).token ?? "").slice(0, 100);
  if (!token) {
    return (
      <Shell title="Link missing" lede="Open the link from the email again, or ask for a new one.">
        <Link href="/account/forgot" className="label inline-block bg-chalk px-8 py-4 text-void">
          Send a new link
        </Link>
      </Shell>
    );
  }
  return (
    <Shell title="Choose a new password" lede="This also signs you out on every other device.">
      <AccountForm action={resetAction} submit="Save and sign in" busy="Saving…">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" hint="At least 8 characters." />
      </AccountForm>
    </Shell>
  );
}
