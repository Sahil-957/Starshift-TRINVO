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

  return (
    <section
      ref={stage}
      onMouseMove={track}
      style={{ "--tone": lead.tone, "--kx": "68%", "--ky": "35%" } as React.CSSProperties}
      className="group/hero grain relative isolate overflow-hidden bg-void"
    >
      <div aria-hidden="true" className="keylight pointer-events-none absolute inset-0 transition-[background] duration-700" />


      <div className="relative z-[3] mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-8 px-5 pb-14 pt-6 sm:px-8 lg:min-h-[calc(100svh-6rem)] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6 lg:py-10">
        <div className="order-2 lg:order-1">
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

        <figure className="order-1 mx-auto w-full max-w-[26rem] lg:order-2 lg:w-auto lg:max-w-none lg:pr-36">
          <div className="relative mx-auto aspect-[4/5] w-full lg:h-[min(calc(100svh-20rem),48rem)] lg:w-auto">
            {/* the design's name, huge and hollow, behind everything */}
            <p
              key={lead.slug}
              aria-hidden="true"
              className="display pointer-events-none absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap animate-sweep select-none text-center text-[clamp(4.5rem,9vw,9.5rem)] leading-[0.82] text-transparent"
              style={{ WebkitTextStroke: `1px color-mix(in oklab, ${lead.tone} 24%, transparent)` }}
            >
              {lead.name.split(" ").map((w) => (
                <span key={w} className="block">
                  {w}
                </span>
              ))}
            </p>
            {/* colour bloom behind the barrel */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-[55%] h-[55%] w-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl transition-[background-color] duration-700"
              style={{ backgroundColor: lead.tone }}
            />

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
                  style={{
                    opacity: i === active ? 1 : 0,
                    transform: i === active ? "none" : "translateY(14px) scale(0.98)",
                  }}
                />
              ))}
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
                  <span className="ml-3 min-w-0">
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
