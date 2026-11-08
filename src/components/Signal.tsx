"use client";

import { useState } from "react";

type Status = "idle" | "invalid" | "sending" | "failed" | "done";

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

/** The drop list: addresses are stored in the admin (Drop list tab). */
export default function Signal() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!looksLikeEmail(email)) return setStatus("invalid");
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus(res.ok ? "done" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <section
      id="drop-list"
      className="ambient scroll-mt-20 border-t hairline bg-panel py-20 lg:py-28"
      style={{ "--accent": "var(--color-rose)", "--ax": "20%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <div className="flex items-baseline justify-between gap-6 border-b hairline pb-5">
          <span className="label text-rose">09 — Drop list</span>
          <span className="label text-dim">One email a month</span>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-20">
          <h2 className="display max-w-[13ch] text-[clamp(2.2rem,6vw,4.25rem)] text-chalk">
            New designs go to the list first
          </h2>

          <div>
            {status === "done" ? (
              <div className="border hairline p-8">
                <p className="label text-rose">You&apos;re on the list</p>
                <p className="mt-5 text-[17px] leading-relaxed text-chalk">
                  You&apos;ll hear about new designs before anyone else. One email a
                  month at most.
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
                      if (status === "invalid" || status === "failed") setStatus("idle");
                    }}
                    placeholder="you@example.com"
                    aria-invalid={status === "invalid"}
                    className={`w-full border bg-transparent px-5 py-4 text-[16px] text-chalk outline-none transition-colors placeholder:text-dim focus:border-chalk ${
                      status === "invalid" ? "border-rose" : "hairline"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="label shrink-0 bg-chalk px-8 py-4 text-void transition-colors hover:bg-rose disabled:opacity-60"
                  >
                    {status === "sending" ? "Joining…" : "Join"}
                  </button>
                </div>
                <p
                  role={status === "invalid" || status === "failed" ? "alert" : undefined}
                  className={`mt-4 text-[13px] ${
                    status === "invalid" || status === "failed" ? "text-rose" : "text-dim"
                  }`}
                >
                  {status === "invalid"
                    ? "That address does not look right — check it and try again."
                    : status === "failed"
                      ? "Couldn't add you just now. Please try again in a moment."
                      : "No sharing, no selling. Reply to any email to come off the list."}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
