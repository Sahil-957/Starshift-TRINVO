"use client";

import { useState } from "react";

type Status = "idle" | "invalid" | "done";

/** Simple structural check — no library, no regex escaping surprises. */
function looksLikeEmail(raw: string) {
  const value = raw.trim();
  const at = value.indexOf("@");
  const dot = value.lastIndexOf(".");
  return (
    at > 0 &&
    dot > at + 1 &&
    dot < value.length - 2 &&
    !value.includes(" ") &&
    value.indexOf("@", at + 1) === -1
  );
}

/**
 * Front-end only. No list provider is wired up yet, so the success state says
 * exactly that rather than implying the address was stored.
 */
export default function Signal() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(looksLikeEmail(email) ? "done" : "invalid");
  };

  return (
    <section
      className="ambient border-t hairline bg-panel py-20 lg:py-28"
      style={{ "--accent": "var(--color-rose)", "--ax": "20%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <div className="flex items-baseline justify-between gap-6 border-b hairline pb-5">
          <span className="label text-rose">07 — Drop list</span>
          <span className="label text-dim">One email a month</span>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-20">
          <h2 className="display max-w-[13ch] text-[clamp(2.2rem,6vw,4.25rem)] text-chalk">
            New designs go to the list first
          </h2>

          <div>
            {status === "done" ? (
              <div className="border hairline p-8">
                <p className="label text-rose">Noted</p>
                <p className="mt-5 text-[17px] leading-relaxed text-chalk">
                  The list itself goes live with the store, so nothing has been
                  sent anywhere yet. Check back when we open.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("");
                    setStatus("idle");
                  }}
                  className="wipe label mt-6 text-dim hover:text-chalk"
                >
                  ← Use a different address
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <label htmlFor="signal-email" className="label text-dim">
                  Email address
                </label>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="signal-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "invalid") setStatus("idle");
                    }}
                    placeholder="you@example.com"
                    aria-invalid={status === "invalid"}
                    className={`w-full border bg-transparent px-5 py-4 text-[16px] text-chalk outline-none transition-colors placeholder:text-dim focus:border-chalk ${
                      status === "invalid" ? "border-rose" : "hairline"
                    }`}
                  />
                  <button
                    type="submit"
                    className="label shrink-0 bg-chalk px-8 py-4 text-void transition-colors hover:bg-rose"
                  >
                    Join
                  </button>
                </div>
                <p
                  className={`mt-4 text-[13px] ${
                    status === "invalid" ? "text-rose" : "text-dim"
                  }`}
                >
                  {status === "invalid"
                    ? "That address does not look right — check it and try again."
                    : "No sharing, no selling, unsubscribe in one click."}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
