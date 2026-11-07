"use client";

import Link from "next/link";
import { useState } from "react";
import { useCartLines } from "../cart/view";
import { STATES } from "@/data/india";
import { formatPrice } from "@/data/products";

/** Sends the browser to PayU's payment page with the admin-signed fields. */
function goToPayu(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

const input = "w-full border hairline bg-transparent px-4 py-3 text-[15px] text-chalk outline-none focus:border-chalk";

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`grid gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="label text-dim">{label}</span>
      {children}
    </label>
  );
}

export default function CheckoutForm({ returnError }: { returnError?: string }) {
  const lines = useCartLines();
  const [error, setError] = useState<string | null>(returnError ?? null);
  const [busy, setBusy] = useState(false);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);

  if (lines.length === 0) {
    return (
      <p className="mt-10 text-[15px] text-ash">
        Your cart is empty.{" "}
        <Link href="/shop" className="underline underline-offset-4">
          See the designs
        </Link>
      </p>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    const customer = { name: v("name"), email: v("email"), phone: v("phone") };
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
          customer,
          address: { line1: v("line1"), line2: v("line2"), city: v("city"), state: v("state"), pin: v("pin") },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed. Please try again.");
      // the cart is kept until PayU confirms; the order page clears it
      goToPayu(data.payu.action, data.payu.fields);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={submit} className="grid content-start gap-5 sm:grid-cols-2">
        <F label="Full name" wide>
          <input name="name" required autoComplete="name" className={input} />
        </F>
        <F label="Email">
          <input name="email" type="email" required autoComplete="email" className={input} />
        </F>
        <F label="Mobile">
          <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="98765 43210" className={input} />
        </F>
        <F label="Address" wide>
          <input name="line1" required maxLength={90} autoComplete="address-line1" placeholder="House, street" className={input} />
        </F>
        <F label="Area / landmark (optional)" wide>
          <input name="line2" maxLength={90} autoComplete="address-line2" className={input} />
        </F>
        <F label="City">
          <input name="city" required autoComplete="address-level2" className={input} />
        </F>
        <F label="PIN code">
          <input name="pin" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" className={input} />
        </F>
        <F label="State" wide>
          <select name="state" required defaultValue="" autoComplete="address-level1" className={`${input} bg-void`}>
            <option value="" disabled>
              Choose your state
            </option>
            {STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </F>
        {error && (
          <p role="alert" className="text-[14px] text-rose sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="label w-full bg-chalk px-10 py-4 text-void hover:bg-bronze disabled:opacity-60 sm:w-auto">
            {busy ? "Taking you to PayU…" : "Continue to payment"}
          </button>
          <p className="mt-3 text-[13px] text-dim">
            Secure payment by PayU: UPI, cards and netbanking. Each tumbler is printed after you order.
          </p>
        </div>
      </form>

      <aside className="h-fit border hairline p-6">
        <h2 className="label text-ash">Order summary</h2>
        <ul className="mt-4 grid gap-3">
          {lines.map((l) => (
            <li key={l.slug} className="flex justify-between gap-4 text-[14px]">
              <span className="text-chalk">
                {l.product.name} <span className="text-dim">× {l.quantity}</span>
              </span>
              <span className="font-mono tabular-nums text-ash">{formatPrice(l.product.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex justify-between border-t hairline pt-4 text-[15px] text-chalk">
          Subtotal <span className="font-mono tabular-nums">{formatPrice(subtotal)}</span>
        </p>
        <p className="mt-2 text-[13px] text-dim">Shipping, if any, is added on the payment page. Prices include GST.</p>
      </aside>
    </div>
  );
}
