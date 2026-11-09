"use client";

import { useState } from "react";

/** "Forgot your order number?": the admin emails every order on that address to that address. */
export function EmailMyOrders() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/my-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: new FormData(e.currentTarget).get("email") }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return setState("done");
      setError(data.error ?? "That didn't work. Please try again in a minute.");
      setState("failed");
    } catch {
      setError("That didn't work. Please try again in a minute.");
      setState("failed");
    }
  }
  return (
    <section className="mt-14 border hairline p-6 sm:p-8">
      <h2 className="text-[17px] text-chalk">Forgot your order number?</h2>
      {state === "done" ? (
        <p role="status" className="mt-3 text-[15px] text-ash">
          If there are orders on that email, a list with tracking links is on its way. Check your inbox (and spam).
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-4">
          <p className="text-[14px] text-ash">We&apos;ll email every order on that address, with a tracking link for each.</p>
          {state === "failed" && (
            <p role="alert" className="text-[14px] text-rose">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-label="Email used for your orders"
              placeholder="you@example.com"
              className="w-full border hairline bg-transparent px-4 py-3 text-chalk outline-none focus:border-chalk"
            />
            <button type="submit" disabled={state === "sending"} className="label shrink-0 border hairline px-6 py-3 text-chalk transition-colors hover:bg-chalk hover:text-void disabled:opacity-50">
              {state === "sending" ? "Sending…" : "Email my orders"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
