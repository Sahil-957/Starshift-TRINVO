"use client";

import Link from "next/link";
import { useState } from "react";
import { cart, useCart } from "@/lib/cart";

export default function AddToCart({ slug, accent, className = "" }: { slug: string; accent: string; className?: string }) {
  const lines = useCart();
  const [added, setAdded] = useState(false);
  const inCart = lines.find((l) => l.slug === slug)?.quantity ?? 0;

  return (
    <div className={`grid gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => {
          cart.add(slug);
          setAdded(true);
        }}
        className="label px-8 py-4 text-void transition-opacity hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        Add to cart
      </button>
      {(added || inCart > 0) && (
        <p role="status" className="text-[13px] text-ash">
          {inCart} in your cart ·{" "}
          <Link href="/cart" className="underline underline-offset-4 hover:text-chalk">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}

export function CartLink() {
  const count = useCart().reduce((n, l) => n + l.quantity, 0);
  return (
    <Link href="/cart" aria-label={`Cart, ${count} items`} className="label flex h-10 items-center gap-2 border hairline px-3 text-ash hover:text-chalk">
      Cart
      {count > 0 && <span className="min-w-5 bg-chalk px-1 text-center text-void">{count}</span>}
    </Link>
  );
}
