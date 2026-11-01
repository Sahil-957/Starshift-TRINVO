"use client";

import { useState } from "react";
import ProductFrame from "./ProductFrame";
import SpinViewer from "./SpinViewer";
import type { Product } from "@/data/products";

/**
 * Lead shot, a 360° turntable, then the rest of `product.images`. The
 * turntable sits second so the first thing a visitor sees is the clean front.
 */
export default function ProductGallery({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [lead, ...rest] = product.images;
  // index 1 is the turntable; the remaining shots follow it
  const tabs = [lead, null, ...rest];
  const current = tabs[active];

  return (
    <div className={className}>
      {current === null ? (
        <SpinViewer key={product.slug} product={product} />
      ) : (
        <ProductFrame
          product={product}
          image={current}
          className="aspect-[4/5]"
          sizes="(max-width: 1024px) 92vw, 46vw"
          priority={active === 0}
          lightY="30%"
        />
      )}

      <ul className="mt-3 grid grid-cols-4 gap-3">
        {tabs.map((shot, i) => (
          <li key={shot?.file ?? "spin"}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={shot ? shot.alt : `${product.name}, 360° view`}
              aria-current={i === active}
              className={`relative block w-full transition-opacity ${
                i === active ? "opacity-100" : "opacity-55 hover:opacity-90"
              }`}
            >
              <ProductFrame
                product={product}
                image={shot ?? lead}
                className={`aspect-square border ${i === active ? "border-chalk" : "hairline"}`}
                sizes="12vw"
              />
              {!shot && (
                <span className="label absolute inset-0 z-[3] flex items-center justify-center bg-void/55 text-chalk">
                  360°
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
