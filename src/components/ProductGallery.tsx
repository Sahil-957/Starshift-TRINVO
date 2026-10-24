"use client";

import { useState } from "react";
import ProductFrame from "./ProductFrame";
import type { Product } from "@/data/products";

/**
 * Lead shot plus a thumbnail row. Driven entirely by `product.images`, so
 * photography can be added in `data/products.ts` without touching this file
 * or the product page: zero or one image renders the frame alone.
 */
export default function ProductGallery({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const shots = product.images;

  return (
    <div className={className}>
      <ProductFrame
        product={product}
        image={shots[active]}
        className="aspect-[4/5]"
        sizes="(max-width: 1024px) 92vw, 46vw"
        priority
        lightY="30%"
      />

      {shots.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {shots.map((shot, i) => (
            <li key={shot.file}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={shot.alt}
                aria-current={i === active}
                className={`block w-full transition-opacity ${
                  i === active ? "opacity-100" : "opacity-50 hover:opacity-80"
                }`}
              >
                <ProductFrame
                  product={product}
                  image={shot}
                  className={`aspect-square border ${
                    i === active ? "border-chalk" : "hairline"
                  }`}
                  sizes="12vw"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
