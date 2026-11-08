"use client";

import { useEffect, useState } from "react";

export type Review = { id: string; rating: number; title: string; body: string; author: string; date: string | null; product: string; slug: string };
export type Data = { count: number; average: number | null; breakdown: Record<number, number>; reviews: Review[] };

// the summary near the price and the section below share one request
const cache = new Map<string, Promise<Data>>();
export const load = (slug: string) => {
  if (!cache.has(slug)) {
    cache.set(
      slug,
      fetch(`/api/reviews?product=${encodeURIComponent(slug)}`)
        .then((r) => r.json() as Promise<Data>)
        .catch(() => ({ count: 0, average: null, breakdown: {}, reviews: [] })),
    );
  }
  return cache.get(slug)!;
};

export function useReviews(slug: string) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let live = true;
    load(slug).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [slug]);
  return data;
}

export function Stars({ value, color, className = "" }: { value: number; color: string; className?: string }) {
  return (
    <span className={`relative inline-block leading-none tracking-[0.12em] ${className}`} style={{ color }} aria-hidden="true">
      <span style={{ color: `color-mix(in oklab, ${color} 28%, transparent)` }}>★★★★★</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap" style={{ width: `${(value / 5) * 100}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

const plural = (n: number) => `${n} review${n === 1 ? "" : "s"}`;

/** Stars and count beside the price; links down to the reviews. */
export function RatingSummary({ slug, accent }: { slug: string; accent: string }) {
  const data = useReviews(slug);
  if (!data?.count || data.average === null) return null;
  return (
    <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-[14px] text-ash hover:text-chalk">
      <Stars value={data.average} color={accent} className="text-[15px]" />
      <span style={{ color: accent }}>{data.average.toFixed(1)}</span>
      <span>· {plural(data.count)}</span>
      <span className="sr-only">Rated {data.average} out of 5</span>
    </a>
  );
}

const input = "w-full border hairline bg-transparent px-4 py-3 text-[15px] text-chalk outline-none focus:border-chalk";

/** Published reviews for the design, and the form for buyers to add theirs. */
export default function Reviews({ slug, name, accent }: { slug: string; name: string; accent: string }) {
  const data = useReviews(slug);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: boolean }>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) return setState({ error: "Choose a star rating." });
    setState({ busy: true });
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating, slug }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error ?? "Couldn't send your review. Please try again.");
      setState({ done: true });
    } catch (err) {
      setState({ error: (err as Error).message });
    }
  }

  const count = data?.count ?? 0;
  const average = data?.average ?? null;
  const breakdown = [5, 4, 3, 2, 1].map((s) => [s, data?.breakdown[s] ?? 0] as const);

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-24 border-t hairline py-16 lg:py-24">
      <div className="mx-auto grid max-w-[1500px] gap-12 px-5 sm:px-8 lg:grid-cols-[22rem_1fr] lg:gap-16">
        <div>
          <h2 id="reviews-heading" className="label" style={{ color: accent }}>
            Reviews
          </h2>
          {count && average !== null ? (
            <>
              <p className="mt-6 flex items-end gap-3">
                <span className="font-mono text-6xl tabular-nums leading-none text-chalk">{average.toFixed(1)}</span>
                <span className="pb-1 text-[14px] text-ash">out of 5</span>
              </p>
              <Stars value={average} color={accent} className="mt-4 text-[22px]" />
              <p className="mt-3 text-[14px] text-ash">{plural(count)} from verified buyers</p>
              <ul className="mt-6 grid gap-2">
                {breakdown.map(([s, n]) => (
                  <li key={s} className="flex items-center gap-3 text-[13px] text-dim">
                    <span className="w-6 tabular-nums">{s}★</span>
                    <span className="h-1.5 flex-1 bg-chalk/10">
                      <span className="block h-full" style={{ width: `${(n / count) * 100}%`, backgroundColor: accent }} />
                    </span>
                    <span className="w-6 text-right tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="display mt-6 text-[clamp(1.75rem,3vw,2.5rem)] text-chalk">No reviews yet</p>
              <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ash">
                {data ? `Own ${name}? Be the first to tell others what it’s like.` : "Loading…"}
              </p>
            </>
          )}

          {!open && !state.done && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="label mt-8 border hairline px-6 py-3.5 text-chalk transition-colors hover:bg-chalk hover:text-void"
            >
              Write a review
            </button>
          )}
        </div>

        <div>
          {state.done ? (
            <div className="border hairline p-6">
              <p className="text-[17px] text-chalk">Thank you for your review!</p>
              <p className="mt-2 text-[14px] text-ash">We read every one; it will appear here once it&apos;s checked.</p>
            </div>
          ) : open ? (
            <form onSubmit={submit} className="grid gap-5 border hairline p-6 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="label text-dim">Your rating</legend>
                <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={rating === s}
                      aria-label={`${s} star${s === 1 ? "" : "s"}`}
                      onClick={() => setRating(s)}
                      className="text-[30px] leading-none transition-transform hover:scale-110"
                      style={{ color: s <= rating ? accent : `color-mix(in oklab, ${accent} 30%, transparent)` }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="grid gap-2">
                <span className="label text-dim">Your name</span>
                <input name="name" required maxLength={60} autoComplete="name" className={input} />
                <span className="text-[12px] text-dim">Shown as first name and last initial</span>
              </label>
              <label className="grid gap-2">
                <span className="label text-dim">Order number</span>
                <input name="number" required maxLength={40} placeholder="TNV-1001" className={`${input} uppercase`} />
                <span className="text-[12px] text-dim">It&apos;s in your order confirmation email</span>
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="label text-dim">Email you ordered with</span>
                <input name="email" type="email" required autoComplete="email" className={input} />
                <span className="text-[12px] text-dim">Only to confirm your order; never shown</span>
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="label text-dim">Headline (optional)</span>
                <input name="title" maxLength={80} className={input} />
              </label>
              <label className="grid gap-2 sm:col-span-2">
                <span className="label text-dim">Your review</span>
                <textarea name="body" required minLength={10} maxLength={2000} rows={5} className={input} />
              </label>
              {state.error && (
                <p role="alert" className="text-[14px] text-rose sm:col-span-2">
                  {state.error}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button
                  type="submit"
                  disabled={state.busy}
                  className="label px-8 py-4 text-void hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {state.busy ? "Sending…" : "Send review"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="label text-dim hover:text-chalk">
                  Cancel
                </button>
              </div>
            </form>
          ) : count ? (
            <ul className="grid gap-px border-y hairline">
              {data!.reviews.map((r) => (
                <li key={r.id} className="border-b hairline py-6 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Stars value={r.rating} color={accent} className="text-[15px]" />
                    <span className="label text-dim">
                      {r.author} · Verified buyer
                      {r.date && ` · ${new Date(r.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
                    </span>
                  </div>
                  {r.title && <p className="mt-3 text-[16px] text-chalk">{r.title}</p>}
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ash">{r.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border hairline p-8 text-[14px] leading-relaxed text-dim">
              Reviews here come only from people who bought this design, checked against their order.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
