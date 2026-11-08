"use client";

import Link from "next/link";
import ProductFrame from "@/components/ProductFrame";
import { formatPrice, getProduct, shippingFor } from "@/data/products";
import { cart, useCart } from "@/lib/cart";

/** Lines with a product that is still on sale; anything else is dropped from view. */
export function useCartLines() {
  return useCart()
    .map((l) => ({ ...l, product: getProduct(l.slug) }))
    .filter((l): l is typeof l & { product: NonNullable<typeof l.product> } => Boolean(l.product));
}

export default function CartView() {
  const lines = useCartLines();
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);

  if (lines.length === 0) {
    return (
      <div className="mt-10 border hairline p-10 text-center">
        <p className="text-[17px] text-chalk">Your cart is empty.</p>
        <Link href="/shop" className="label mt-6 inline-block bg-chalk px-8 py-4 text-void">
          See the designs
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-10 border-t hairline">
        {lines.map((l) => (
          <li key={l.slug} className="flex items-center gap-5 border-b hairline py-5">
            <ProductFrame product={l.product} image={l.product.images[0]} className="aspect-[4/5] w-20 shrink-0" sizes="80px" />
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${l.slug}`} className="text-[16px] text-chalk hover:underline">
                {l.product.name}
              </Link>
              <p className="mt-1 text-[13px] text-dim">{formatPrice(l.product.price)} each</p>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" aria-label={`One fewer ${l.product.name}`} onClick={() => cart.set(l.slug, l.quantity - 1)} className="h-8 w-8 border hairline text-ash hover:text-chalk">
                  −
                </button>
                <span className="w-6 text-center tabular-nums text-chalk" aria-live="polite">
                  {l.quantity}
                </span>
                <button type="button" aria-label={`One more ${l.product.name}`} onClick={() => cart.set(l.slug, l.quantity + 1)} disabled={l.quantity >= 10} className="h-8 w-8 border hairline text-ash hover:text-chalk disabled:opacity-40">
                  +
                </button>
                <button type="button" onClick={() => cart.set(l.slug, 0)} className="label ml-4 text-dim hover:text-chalk">
                  Remove
                </button>
              </div>
            </div>
            <p className="font-mono tabular-nums text-chalk">{formatPrice(l.product.price * l.quantity)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-[15px] text-ash">
            Subtotal <span className="ml-3 font-mono text-xl text-chalk">{formatPrice(subtotal)}</span>
          </p>
          <p className="mt-1 text-[13px] text-dim">
            Shipping {shippingFor(subtotal) ? formatPrice(shippingFor(subtotal)) : "free"} · Prices include GST.
          </p>
        </div>
        <Link href="/checkout" className="label bg-chalk px-10 py-4 text-void hover:bg-bronze">
          Checkout
        </Link>
      </div>
    </>
  );
}
