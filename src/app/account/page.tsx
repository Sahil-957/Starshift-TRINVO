import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProduct } from "@/data/products";
import { checkoutEnabled } from "@/lib/admin-api";
import { currentAccount } from "@/lib/account";
import { changePasswordAction, resendVerifyAction, signOutAction } from "./actions";
import { AccountForm, PasswordField } from "./form";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const steps = [
  ["paid", "Paid"],
  ["in_production", "Printing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
] as const;
const other: Record<string, string> = { cancelled: "Cancelled", refunded: "Refunded", returned: "Returned" };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  if (!checkoutEnabled) notFound();
  const me = await currentAccount();
  if (!me) redirect("/account/sign-in");
  const { customer, orders } = me;
  const reset = (await searchParams).reset;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="label text-dim">My account</p>
      <h1 className="display mt-4 text-[clamp(2.25rem,6vw,3.5rem)] text-chalk">Hi, {customer.name.split(/\s+/)[0]}</h1>
      <p className="mt-3 text-[15px] text-ash">{customer.email}</p>

      {reset && (
        <p role="status" className="mt-6 border border-jade/40 p-4 text-[14px] text-chalk">
          Your new password is saved and you&apos;re signed in.
        </p>
      )}

      {!customer.verified ? (
        <section className="mt-10 border border-bronze/50 p-6 sm:p-8">
          <h2 className="text-[17px] text-chalk">Confirm your email to see your orders</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ash">
            We sent a link to <span className="text-chalk">{customer.email}</span>. Tap it and every order placed with this email shows up here. It keeps
            your orders private to whoever owns the inbox.
          </p>
          <div className="mt-5">
            <AccountForm action={resendVerifyAction} submit="Send the link again" busy="Sending…" quiet />
          </div>
        </section>
      ) : (
        <section className="mt-12">
          <h2 className="label text-ash">Your orders</h2>
          {orders.length === 0 ? (
            <div className="mt-4 border hairline p-8 text-center">
              <p className="text-[15px] text-ash">No orders yet.</p>
              <Link href="/shop" className="label mt-6 inline-block bg-chalk px-8 py-4 text-void hover:bg-bronze">
                See the designs
              </Link>
            </div>
          ) : (
            <ul className="mt-4 grid gap-4">
              {orders.map((o) => {
                const reached = steps.findIndex(([s]) => s === o.status);
                return (
                  <li key={o.number} className="border hairline p-5 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-mono text-[15px] text-chalk">{o.number}</p>
                      <p className="text-[13px] text-dim">
                        {date(o.placedAt)} · <span className="font-mono text-ash">₹{(o.totalMinor / 100).toLocaleString("en-IN")}</span>
                      </p>
                    </div>
                    <ul className="mt-4 grid gap-3">
                      {o.items.map((i) => {
                        const p = getProduct(i.slug);
                        return (
                          <li key={i.slug} className="flex items-center gap-4">
                            <span className="relative block h-14 w-11 shrink-0 overflow-hidden bg-chalk/5">
                              {p?.images[0] && <Image src={`/products/${p.images[0].file}`} alt="" fill sizes="44px" className="object-cover" />}
                            </span>
                            {p ? (
                              <Link href={`/shop/${i.slug}`} className="text-[15px] text-chalk hover:underline">
                                {i.title}
                              </Link>
                            ) : (
                              <span className="text-[15px] text-chalk">{i.title}</span>
                            )}
                            <span className="ml-auto text-[14px] text-ash">× {i.quantity}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {reached >= 0 ? (
                      <ol className="mt-5 grid grid-cols-4 gap-2" aria-label={`Status: ${steps[reached][1]}`}>
                        {steps.map(([s, label], i) => (
                          <li key={s} className={`border-t-2 pt-2 ${i <= reached ? "border-chalk text-chalk" : "border-chalk/15 text-dim"}`}>
                            <span className="label text-[10px] sm:text-[11px]">{label}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="label mt-5 text-dim">{other[o.status] ?? o.status}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
                      {o.trackingUrl && (
                        <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="text-chalk underline underline-offset-4">
                          Track the parcel ↗
                        </a>
                      )}
                      {o.courier && o.awb && (
                        <span className="text-ash">
                          {o.courier} · AWB {o.awb}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="mt-16 border-t hairline pt-10">
        <h2 className="label text-ash">{customer.hasPassword ? "Change password" : "Add a password"}</h2>
        {!customer.hasPassword && (
          <p className="mt-3 max-w-md text-[14px] text-ash">You sign in with Google. Add a password to also sign in with your email.</p>
        )}
        <div className="mt-6 max-w-sm">
          <AccountForm action={changePasswordAction} submit={customer.hasPassword ? "Change password" : "Add password"} busy="Saving…" quiet>
            {customer.hasPassword && <PasswordField label="Current password" name="current" required autoComplete="current-password" />}
            <PasswordField
              label="New password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              hint={customer.hasPassword ? "At least 8 characters. Signs out your other devices." : "At least 8 characters."}
              meter
            />
          </AccountForm>
        </div>
      </section>

      <form action={signOutAction} className="mt-12 border-t hairline pt-10">
        <button type="submit" className="label text-ash underline underline-offset-4 hover:text-chalk">
          Sign out
        </button>
      </form>
    </div>
  );
}
