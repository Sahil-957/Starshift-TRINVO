"use client";

import Link from "next/link";
import { useState } from "react";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import SpinViewer from "./SpinViewer";
import { swatchFill } from "./DesignPicker";
import { barrel, formatPrice, products } from "@/data/products";

/** Homepage 360° section: every design, every side, before anyone buys. */
export default function Turntable() {
  const [active, setActive] = useState(0);
  const p = products[active];

  return (
    <section
      id="turntable"
      className="ambient scroll-mt-20 border-t hairline py-20 lg:py-32"
      style={{ "--accent": p.tone, "--ax": "30%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <SectionHead
          index="03"
          label="360° view"
          accent={p.accent}
          title="See every side"
          lede="Most stores show you one flattering angle. Drag the tumbler round and see the whole wrap, the lid and the straw, exactly as it is printed."
        />

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-20">
          <Reveal>
            <SpinViewer key={p.slug} product={p} />
          </Reveal>

          <div>
            <p className="label text-dim">Pick a design to turn</p>
            <div className="mt-5 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Design to turn">
              {products.map((d, i) => (
                <button
                  key={d.slug}
                  type="button"
                  role="radio"
                  aria-checked={i === active}
                  aria-label={d.name}
                  title={d.name}
                  onClick={() => setActive(i)}
                  className={`rounded-full p-[3px] ${
                    i === active ? "ring-1 ring-chalk" : "ring-1 ring-transparent hover:ring-chalk/40"
                  }`}
                >
                  <span className="block h-9 w-9 rounded-full ring-1 ring-inset ring-white/15" style={{ background: swatchFill(d) }} />
                </button>
              ))}
            </div>

            <h3 className="display mt-10 text-[clamp(2rem,4.5vw,3.5rem)] text-chalk">{p.name}</h3>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ash">{p.description}</p>
            <p className="label mt-6 text-dim">
              {p.finish} · {barrel.capacity} · {formatPrice(p.price)}
            </p>
            <Link
              href={`/shop/${p.slug}`}
              className="label mt-8 inline-block px-8 py-4 text-void transition-opacity hover:opacity-85"
              style={{ backgroundColor: p.accent }}
            >
              View {p.name}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
