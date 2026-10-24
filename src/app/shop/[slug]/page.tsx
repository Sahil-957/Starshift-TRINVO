import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import ReturnsSummary from "@/components/ReturnsSummary";
import ProductCard from "@/components/ProductCard";
import Swatches from "@/components/Swatches";
import { barrel, formatPrice, getProduct, products } from "@/data/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.tagline };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const others = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <>
      <div className="mx-auto grid max-w-[1500px] gap-10 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:pb-28">
        <ProductGallery
          product={product}
          className="lg:sticky lg:top-24 lg:self-start"
        />

        <div>
          <nav className="label flex items-center gap-2 text-dim">
            <Link href="/shop" className="wipe hover:text-chalk">
              Designs
            </Link>
            <span>/</span>
            <span className="text-chalk">{product.name}</span>
          </nav>

          <h1 className="display mt-8 text-[clamp(2.6rem,7vw,5rem)] text-chalk">
            {product.name}
          </h1>
          <p className="mt-4 text-[16px] text-ash">{product.tagline}</p>

          <div className="mt-7 flex items-center gap-4">
            <span className="label text-dim">Palette</span>
            <Swatches palette={product.palette} size="lg" />
          </div>

          <p className="mt-8 font-mono text-2xl tracking-tight tabular-nums text-chalk">
            {formatPrice(product.price)}
          </p>

          <p className="mt-8 max-w-lg text-[15px] leading-relaxed text-ash">
            {product.description}
          </p>

          <dl className="mt-12 border-t hairline">
            {[
              ["Capacity", `${barrel.capacity} (${barrel.capacityMl} ml)`],
              ["Body", barrel.material],
              ["Lid", barrel.lid],
              ["Surface", barrel.print],
              ["Artwork", "Drawn in-house"],
              ["Origin", "India"],
            ].map(([key, value]) => (
              <div
                key={key}
                className="flex items-baseline justify-between gap-6 border-b hairline py-4"
              >
                <dt className="label text-dim">{key}</dt>
                <dd className="text-right text-[15px] text-chalk">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <span className="label cursor-not-allowed border hairline px-8 py-4 text-dim">
              Checkout opens soon
            </span>
            <Link
              href="/contact"
              className="label border hairline px-8 py-4 text-chalk transition-colors hover:bg-chalk hover:text-void"
            >
              Ask about this design
            </Link>
          </div>
          <p className="mt-5 max-w-md text-[13px] leading-relaxed text-dim">
            Ordering is not live yet. Specifications on this page are
            provisional until the production run is confirmed.
          </p>

          <ReturnsSummary fulfilment={product.fulfilment} />
        </div>
      </div>

      <section className="border-t hairline py-16 lg:py-24">
        <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
          <div className="flex items-baseline justify-between gap-6 border-b hairline pb-5">
            <span className="label" style={{ color: product.accent }}>
              More designs
            </span>
            <Link href="/shop" className="wipe label text-ash hover:text-chalk">
              All eight →
            </Link>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {others.map((other, i) => (
              <li key={other.slug}>
                <ProductCard
                  product={other}
                  index={i}
                  sizes="(max-width: 1024px) 46vw, 23vw"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
