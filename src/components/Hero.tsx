"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { barrel, formatPrice, products } from "@/data/products";

/** Where each part sits in the 4:5 studio render, in % of the frame. */
const callouts = [
  { y: 21, x: 53, title: "Reusable metal straw", body: "Brushed steel, in the box" },
  { y: 33, x: 64.5, title: "Splash-proof lid", body: "Clear, snug over the rim" },
  { y: 52, x: 63, title: "Full-wrap print", body: "Edge to edge, all the way round" },
  { y: 83, x: 63, title: "304 stainless steel", body: `Double-wall · ${barrel.capacity}` },
];

/** inactive designs sit slightly lower and smaller, so the swap feels like a lift */
const swap = "translateY(14px) scale(0.98)";

const edges = "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)";

const mask =
  "linear-gradient(to right, transparent, #000 22%, #000 78%, transparent), linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent)";

/**
 * Opening frame. The studio render sits straight on the page (screen-blended,
 * edges masked) so the tumbler floats rather than sitting in a box, with the
 * parts called out on it. The rail below steps through every design on a
 * timer until the visitor picks one.
 */
export default function Hero() {
  const stage = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const lead = products[active];

  /** Written straight to CSS custom properties — no re-render per frame. */
  const track = (event: React.MouseEvent) => {
    const el = stage.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--kx", `${((event.clientX - box.left) / box.width) * 100}%`);
    el.style.setProperty("--ky", `${((event.clientY - box.top) / box.height) * 100}%`);
  };

  const pick = (i: number) => {
    setAuto(false);
    setActive(i);
  };

  /** Swipe the tumbler left/right for the next/previous design. */
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeEnd = (event: React.TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return; // a tap or a scroll
    pick((active + (dx < 0 ? 1 : -1) + products.length) % products.length);
  };

  return (
    <section
      ref={stage}
      onMouseMove={track}
      style={{ "--tone": lead.tone, "--kx": "68%", "--ky": "35%" } as React.CSSProperties}
      className="group/hero grain relative isolate overflow-hidden bg-void"
    >
      <div aria-hidden="true" className="keylight pointer-events-none absolute inset-0 transition-[background] duration-700" />


      <div className="relative z-[3] mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-8 px-5 pb-14 pt-6 sm:px-8 lg:min-h-[calc(100svh-6rem)] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6 lg:py-10">
        {/* phones: headline, then the tumbler, then the pitch; desktop: text left, tumbler right */}
        <div className="contents lg:order-1 lg:block">
          <div className="order-1">
          <p className="label animate-sweep text-ash">
            {products.length} designs · one {barrel.capacity} barrel
          </p>

          <h1 className="display mt-6 animate-cut text-[clamp(2.75rem,7vw,6rem)] text-chalk">
            Make every
            <br />
            sip{" "}
            <span className="transition-colors duration-700" style={{ color: lead.accent }}>
              your style.
            </span>
          </h1>
          </div>

          <div className="order-3">
          <p className="mt-7 max-w-md text-[16px] leading-relaxed text-ash">
            304 stainless, double-wall insulated, a splash-proof lid and a metal
            straw in the box, with the design printed edge to edge. Not just
            another tumbler.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={`/shop/${lead.slug}`}
              className="label w-full px-8 py-4 text-center text-void transition-[background-color] duration-700 hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: lead.accent }}
            >
              Shop {lead.name} · {formatPrice(lead.price)}
            </Link>
            <Link
              href="/shop"
              className="label w-full border hairline px-8 py-4 text-center text-chalk transition-colors hover:bg-chalk hover:text-void sm:w-auto"
            >
              See all {products.length}
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-2 border-t hairline pt-6">
            {["Printed to order in India", "7-day fault cover", "Full-wrap sublimation print"].map((t) => (
              <li key={t} className="label text-dim">
                {t}
              </li>
            ))}
          </ul>
          </div>
        </div>

        <figure className="order-2 mx-auto w-full max-w-[26rem] lg:order-2 lg:w-auto lg:max-w-none lg:pr-36">
          <div
            onTouchStart={(e) => (swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
            onTouchEnd={swipeEnd}
            className="relative mx-auto aspect-[4/5] w-full touch-pan-y lg:h-[clamp(26rem,calc(100svh-9rem),50rem)] lg:w-auto"
          >
            {/* colour bloom behind the barrel */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-[52%] h-[75%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[90px] transition-[background-color] duration-700"
              style={{ backgroundColor: lead.tone }}
            />

            {/* 1. the studio shot as a backdrop, blended into the page */}
            <div className="absolute inset-0 mix-blend-screen" style={{ maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}>
              {products.map((p, i) => (
                <Image
                  key={p.slug}
                  src={`/products/${p.images[0].file}`}
                  alt={i === active ? p.images[0].alt : ""}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 26rem, 40rem"
                  className="object-cover transition-[opacity,transform] duration-[900ms] ease-out"
                  style={{ opacity: i === active ? 1 : 0, transform: i === active ? "none" : swap }}
                />
              ))}
            </div>

            {/* 2. the design's name, two rows drifting opposite ways over the backdrop,
                nudged against the cursor for depth… */}
            <div
              key={lead.slug}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-12%] top-1/2 animate-sweep select-none lg:inset-x-[-12%]"
              style={{
                maskImage: edges,
                WebkitMaskImage: edges,
                translate: "calc((var(--kx) - 50%) * -0.06) calc(-50% + (var(--ky) - 35%) * -0.06)",
                transition: "translate 700ms ease-out",
              }}
            >
              {[0, 1].map((row) => (
                <div
                  key={row}
                  className="display flex w-max animate-drift whitespace-nowrap text-[clamp(4.25rem,9vw,9.5rem)] leading-[0.95]"
                  style={{
                    animationDuration: "48s",
                    animationDirection: row ? "reverse" : "normal",
                    color: row ? "transparent" : `color-mix(in oklab, ${lead.tone} 28%, transparent)`,
                    WebkitTextStroke: `1px color-mix(in oklab, ${lead.tone} ${row ? 55 : 70}%, transparent)`,
                  }}
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} className="pr-[0.35em]">
                      {lead.name} <span className="opacity-60">✦</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {/* 3. …and the tumbler itself on top, cut out by its rendered silhouette
                (public/products/mask, from scripts/studio.py --shots mask) */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {products.map((p, i) => {
                const silhouette = `url(/products/mask/${p.slug}.png)`;
                return (
                  <Image
                    key={p.slug}
                    src={`/products/${p.images[0].file}`}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 26rem, 40rem"
                    className="object-cover transition-[opacity,transform] duration-[900ms] ease-out"
                    style={{
                      opacity: i === active ? 1 : 0,
                      transform: i === active ? "none" : swap,
                      maskImage: silhouette,
                      WebkitMaskImage: silhouette,
                      maskSize: "100% 100%",
                      WebkitMaskSize: "100% 100%",
                    }}
                  />
                );
              })}
            </div>

            {/* parts, called out on the product itself */}
            <ul className="pointer-events-none absolute inset-0 hidden lg:block">
              {callouts.map((c, i) => (
                <li
                  key={c.title}
                  className="absolute flex -translate-y-1/2 animate-sweep items-center"
                  style={{ top: `${c.y}%`, left: `${c.x}%`, animationDelay: `${400 + i * 120}ms` }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-chalk shadow-[0_0_10px_2px_rgba(226,255,244,0.5)]" />
                  <span className="h-px w-12 shrink-0 bg-chalk/40" />
                  <span className="ml-3 min-w-0 [text-shadow:0_0_14px_var(--color-void),0_0_4px_var(--color-void)]">
                    <span className="block whitespace-nowrap text-[13px] text-chalk">{c.title}</span>
                    <span className="label mt-1 block whitespace-nowrap text-[10px] text-dim">{c.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <figcaption className="mt-2 text-center">
            <span className="label text-dim">
              {String(active + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")} · {lead.finish}
            </span>
            <span className="mt-2 block text-[15px] text-chalk">
              {lead.name} <span className="text-ash">— {lead.tagline}</span>
            </span>
          </figcaption>

          <div
            className="-mx-5 mt-5 flex snap-x gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0"
            role="radiogroup"
            aria-label="Choose a design"
          >
            {products.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                role="radio"
                aria-checked={i === active}
                aria-label={p.name}
                title={p.name}
                onClick={() => pick(i)}
                className={`relative h-[4.5rem] w-11 shrink-0 snap-start overflow-hidden border transition-[opacity,transform,border-color] duration-500 ${
                  i === active ? "-translate-y-1 border-chalk/60 opacity-100" : "border-transparent opacity-50 hover:opacity-90"
                }`}
              >
                <Image
                  src={`/products/${p.images[0].file}`}
                  alt=""
                  fill
                  sizes="120px"
                  className="origin-[50%_56%] scale-[2.1] object-cover"
                />
                {auto && i === active && (
                  <span
                    // remount restarts the timer; its end moves the rail on
                    key={active}
                    onAnimationEnd={() => setActive((active + 1) % products.length)}
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-fill bg-chalk group-hover/hero:[animation-play-state:paused] motion-reduce:hidden"
                  />
                )}
              </button>
            ))}
          </div>
        </figure>
      </div>
    </section>
  );
}
