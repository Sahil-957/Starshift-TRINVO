import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { checkoutEnabled } from "@/lib/admin-api";
import { accountCall } from "@/lib/account";
import Shell from "../shell";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false }, referrer: "no-referrer" };

export default async function Verify({ searchParams }: PageProps<"/account/verify">) {
  if (!checkoutEnabled) notFound();
  const token = String((await searchParams).token ?? "").slice(0, 100);
  let ok = false;
  try {
    ok = !!token && (await accountCall("verify", { token })).data.ok === true;
  } catch {}
  return ok ? (
    <Shell title="Email confirmed" lede="Thanks! Your orders now show in your account.">
      <Link href="/account" className="label inline-block bg-chalk px-8 py-4 text-void hover:bg-bronze">
        See my orders
      </Link>
    </Shell>
  ) : (
    <Shell title="That link didn't work" lede="It may have expired (links last 48 hours). Sign in and send a fresh one from your account page.">
      <Link href="/account" className="label inline-block bg-chalk px-8 py-4 text-void hover:bg-bronze">
        Go to my account
      </Link>
    </Shell>
  );
}
