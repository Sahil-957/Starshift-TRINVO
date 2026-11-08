"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cart, useCart } from "@/lib/cart";

/** Buy now: make sure this design is in the cart, then go straight to checkout. */
function useBuyNow(slug: string) {
  const router = useRouter();
  const lines = useCart();
  return () => {
    if (!lines.some((l) => l.slug === slug)) cart.add(slug);
    router.push("/checkout");
  };
}

export default function AddToCart({ slug, accent, className = "" }: { slug: string; accent: string; className?: string }) {
  const lines = useCart();
  const buyNow = useBuyNow(slug);
  const [added, setAdded] = useState(false);
  const inCart = lines.find((l) => l.slug === slug)?.quantity ?? 0;

  return (
    <div className={`grid gap-2 ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={buyNow}
          className="label px-4 py-4 text-void transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          Buy now
        </button>
        <button
          type="button"
          onClick={() => {
            cart.add(slug);
            setAdded(true);
          }}
          className="label border px-4 py-4 text-chalk transition-colors hover:bg-chalk hover:text-void"
          style={{ borderColor: accent }}
        >
          Add to cart
        </button>
      </div>
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

/** The phone's sticky bottom bar: one tap to checkout. */
export function BuyNowButton({ slug, accent }: { slug: string; accent: string }) {
  const buyNow = useBuyNow(slug);
  return (
    <button type="button" onClick={buyNow} className="label shrink-0 px-6 py-3.5 text-void" style={{ backgroundColor: accent }}>
      Buy now
    </button>
  );
}
