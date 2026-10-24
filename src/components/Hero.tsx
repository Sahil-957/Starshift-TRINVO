"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import Swatches from "./Swatches";
import { formatPrice, getProduct, products, siteImages } from "@/data/products";

const lead = getProduct("prism")!;

/**
 * Opening frame: type on the left, the lead design lit on a plate to the
 * right. The key light follows the pointer, which is the only motion on the
 * section until you scroll.
 */
export default function Hero() {
  const stage = useRef<HTMLElement>(null);

  /** Written straight to CSS custom properties — no re-render per frame. */
  const track = (event: React.MouseEvent) => {
    const el = stage.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    el.style.setProperty("--kx", `${x}%`);
    el.style.setProperty("--ky", `${y}%`);
    /* counter-light tracks the opposite corner */
    el.style.setProperty("--rx", `${100 - x}%`);
    el.style.setProperty("--ry", `${100 - y}%`);
  };

  return (
    <section
      ref={stage}
      onMouseMove={track}
      style={
        {
          "--tone": lead.tone,
          "--rim": "#d9733c",
          "--kx": "28%",
          "--ky": "24%",
          "--rx": "82%",
          "--ry": "76%",
        } as React.CSSProperties
      }
      className="grain relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-panel"
    >
      {siteImages.hero && (
        <Image
          src={`/products/${siteImages.hero}`}
          alt=""
          fill
          priority
          sizes="100vw"
          className="z-0 object-cover opacity-55"
        />
      )}

      {/* split key + counter light */}
      <div aria-hidden="true" className="keylight pointer-events-none absolute inset-0 z-[1]" />

      {/* scrim so type always clears the plate */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to top, rgba(8,8,10,0.92) 0%, rgba(8,8,10,0.45) 44%, rgba(8,8,10,0.2) 100%)",
        }}
      />

      <div className="relative z-[3] mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-5 pb-8 pt-10 sm:px-8 sm:pb-12 sm:pt-16">
        <div className="grid flex-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
          <div>
            <p className="label animate-sweep text-cobalt">01 — Collection</p>

            <h1 className="display mt-6 animate-cut text-[clamp(2.75rem,9vw,7.5rem)] text-chalk">
              Carry something
              <br />
              <span style={{ color: lead.accent }}>worth carrying.</span>
            </h1>

            <p className="mt-8 max-w-md text-[16px] leading-relaxed text-ash">
              {products.length} original designs, drawn in-house and printed on
              one stainless barrel. Not a colour chart — artwork you would put
              on a wall, on something you actually use.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/shop"
                className="label w-full bg-chalk px-8 py-4 text-center text-void transition-colors hover:bg-plum sm:w-auto"
              >
                See the designs
              </Link>
              <Link
                href="/#configurator"
                className="label w-full border hairline px-8 py-4 text-center text-chalk transition-colors hover:bg-chalk hover:text-void sm:w-auto"
              >
                Find your design
              </Link>
            </div>
          </div>

          {/* brand plate — the mark lit in the lead design's tone */}
          <figure className="relative mx-auto w-full max-w-xs lg:max-w-none">
            <div className="grain relative isolate flex aspect-[4/5] items-center justify-center overflow-hidden border hairline bg-void">
              <div aria-hidden="true" className="keylight absolute inset-0 z-0 opacity-70" />
              <div
                aria-hidden="true"
                className="absolute bottom-[16%] left-1/2 z-0 h-[18%] w-[64%] -translate-x-1/2 rounded-[50%] blur-2xl"
                style={{ background: `color-mix(in oklab, ${lead.accent} 34%, transparent)` }}
              />
              <Image
                src="/trinvo-mark.svg"
                alt=""
                width={254}
                height={237}
                priority
                className="relative z-[1] w-[46%] max-w-[13rem]"
              />
            </div>
            <figcaption className="mt-4 flex items-baseline justify-between gap-4">
              <span className="label text-chalk">Art you can carry</span>
              <span className="label text-dim">Est. 2026 · India</span>
            </figcaption>
          </figure>
        </div>

        {/* slate: what is in frame */}
        <dl className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t hairline pt-6">
          <div className="flex items-baseline gap-2">
            <dt className="label text-dim">In frame</dt>
            <dd className="label" style={{ color: lead.accent }}>
              {lead.name}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="label text-dim">Vol</dt>
            <dd className="label text-chalk">{lead.capacityMl} ml</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="label text-dim">From</dt>
            <dd className="label text-chalk">{formatPrice(lead.price)}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="label text-dim">Palette</dt>
            <dd>
              <Swatches palette={lead.palette} />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
