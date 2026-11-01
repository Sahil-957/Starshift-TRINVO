import Link from "next/link";
import { products, type Product } from "@/data/products";

/** What a design looks like at swatch size: a foil swirls, a solid is flat. */
export const swatchFill = (p: Product) =>
  p.finish === "Liquid foil"
    ? `conic-gradient(from 200deg, ${p.palette.join(", ")}, ${p.palette[0]})`
    : p.palette[0];

/**
 * Every design as a swatch, linked, so a visitor can try each colour on the
 * same page instead of backing out to the grid.
 */
export default function DesignPicker({ current }: { current: Product }) {
  return (
    <div>
      <p className="label text-dim">
        Design — <span className="text-chalk">{current.name}</span>
      </p>
      <ul className="mt-4 flex flex-wrap gap-2.5">
        {products.map((p) => {
          const on = p.slug === current.slug;
          return (
            <li key={p.slug}>
              <Link
                href={`/shop/${p.slug}`}
                scroll={false}
                aria-label={p.name}
                aria-current={on ? "page" : undefined}
                title={p.name}
                className={`block rounded-full p-[3px] transition-colors ${
                  on ? "ring-1 ring-chalk" : "ring-1 ring-transparent hover:ring-chalk/40"
                }`}
              >
                <span
                  className="block h-8 w-8 rounded-full ring-1 ring-inset ring-white/15"
                  style={{ background: swatchFill(p) }}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
