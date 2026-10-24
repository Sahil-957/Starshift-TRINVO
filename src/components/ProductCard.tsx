import Link from "next/link";
import ProductFrame from "./ProductFrame";
import Swatches from "./Swatches";
import { barrel, formatPrice, type Product } from "@/data/products";

export default function ProductCard({
  product,
  index,
  sizes,
}: {
  product: Product;
  index: number;
  sizes?: string;
}) {
  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="relative overflow-hidden">
        <ProductFrame product={product} sizes={sizes} />
        <span
          className="label absolute left-4 top-4 z-[3]"
          style={{ color: product.accent }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="absolute right-4 top-4 z-[3]">
          <Swatches palette={product.palette} />
        </span>
        <span
          className="label absolute inset-x-0 bottom-0 z-[3] translate-y-full py-3.5 text-center text-void transition-transform duration-500 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0"
          style={{ backgroundColor: product.accent }}
        >
          View design
        </span>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4 border-t hairline pt-4">
        <h3 className="display text-xl text-chalk">{product.name}</h3>
        <span className="label tabular-nums text-ash">
          {formatPrice(product.price)}
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-snug text-ash">{product.tagline}</p>
      <p className="label mt-3 text-dim">
        {barrel.capacity} · {barrel.print}
      </p>
    </Link>
  );
}
