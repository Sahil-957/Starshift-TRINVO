import Image from "next/image";
import type { Product, ProductImage } from "@/data/products";

type Props = {
  product: Product;
  /** Which shot to render. Defaults to the product's lead image. */
  image?: ProductImage;
  /** Tailwind aspect utility — frames are portrait by default */
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Vertical position of the key light, as a percentage */
  lightY?: string;
};

/**
 * Every design sits inside one of these: a dark plate lit by a key light in
 * the design's own tone plus a cold counter-light from the opposite corner.
 * With no photography yet (phase 2) it renders a labelled development
 * placeholder instead of a stand-in photo, so a missing shot is obvious.
 */
export default function ProductFrame({
  product,
  image = product.images[0],
  className = "aspect-[4/5]",
  sizes = "(max-width: 768px) 90vw, 33vw",
  priority = false,
  lightY = "26%",
}: Props) {
  return (
    <div
      className={`grain @container relative isolate overflow-hidden bg-panel ${className}`}
      style={
        {
          "--tone": product.tone,
          "--ky": lightY,
        } as React.CSSProperties
      }
    >
      <div aria-hidden="true" className="keylight absolute inset-0 z-0 opacity-80" />

      {image ? (
        <Image
          src={`/products/${image.file}`}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="z-[1] object-cover"
        />
      ) : (
        <EmptyPlate product={product} />
      )}

      {/* vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 42%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </div>
  );
}

function EmptyPlate({ product }: { product: Product }) {
  return (
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-4 px-6 text-center">
      {/* the pool of light the design will stand in */}
      <div
        aria-hidden="true"
        className="absolute bottom-[14%] left-1/2 h-[14%] w-[62%] -translate-x-1/2 rounded-[50%] blur-xl"
        style={{ background: `color-mix(in oklab, ${product.accent} 26%, transparent)` }}
      />
      <span className="label relative text-dim">Placeholder — no photography</span>
      <span className="relative hidden font-mono text-[11px] leading-relaxed text-dim @min-[17rem]:block">
        public/products/{product.slug}-main.jpg
      </span>
    </div>
  );
}
