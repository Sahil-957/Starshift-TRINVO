"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import SectionHead from "./SectionHead";
import { featuredProducts } from "@/data/products";

/**
 * The range as a film strip rather than a grid — drag or swipe horizontally,
 * with snap stops on each frame.
 */
export default function ProductRail() {
  const rail = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const nudge = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const step = el.querySelector("li")?.clientWidth ?? el.clientWidth * 0.8;
    el.scrollBy({ left: direction * (step + 24), behavior: "smooth" });
  };

  return (
    <section
      id="range"
      className="ambient scroll-mt-20 py-20 lg:py-32"
      style={{ "--accent": "var(--color-plum)", "--ax": "86%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <SectionHead
          index="02"
          label="The designs"
          accent="var(--color-plum)"
          title="Six we keep reaching for"
          lede="Every design is drawn in-house and printed full-wrap on the same stainless barrel. Six of the eight are below."
          aside={
            <Link href="/shop" className="wipe label text-ash hover:text-chalk">
              All eight →
            </Link>
          }
        />
      </div>

      <ul
        ref={rail}
        onScroll={sync}
        className="rail rail-gutter mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
      >
        {featuredProducts.map((product, i) => (
          <li
            key={product.slug}
            className="w-[76vw] shrink-0 snap-start sm:w-[42vw] lg:w-[26vw] xl:w-[22vw]"
          >
            <ProductCard
              product={product}
              index={i}
              sizes="(max-width: 640px) 76vw, (max-width: 1024px) 42vw, 24vw"
            />
          </li>
        ))}
        <li aria-hidden="true" className="w-1 shrink-0" />
      </ul>

      <div className="mx-auto mt-10 flex max-w-[1500px] items-center gap-3 px-5 sm:px-8">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={atStart}
          aria-label="Previous products"
          className="label flex h-11 w-11 items-center justify-center border hairline text-chalk transition-colors hover:bg-chalk hover:text-void disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-chalk"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={atEnd}
          aria-label="Next products"
          className="label flex h-11 w-11 items-center justify-center border hairline text-chalk transition-colors hover:bg-chalk hover:text-void disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-chalk"
        >
          →
        </button>
        <span className="label ml-2 text-dim">Drag or swipe</span>
      </div>
    </section>
  );
}
