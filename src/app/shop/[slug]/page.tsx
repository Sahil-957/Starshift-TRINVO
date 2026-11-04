import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import DesignPicker from "@/components/DesignPicker";
import { checkoutEnabled } from "@/lib/admin-api";
import ProductGallery from "@/components/ProductGallery";
import ReturnsSummary from "@/components/ReturnsSummary";
import ProductCard from "@/components/ProductCard";
import { getPolicy } from "@/data/policy";
import { barrel, formatPrice, getProduct, goodToKnow, products } from "@/data/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: `${product.name} — 20 oz Stainless Tumbler`,
    description: `${product.tagline}. ${product.description}`,
    openGraph: { images: [`/products/${product.images[0].file}`] },
  };
}

const details = [
  ["Premium 304 stainless steel", "Crafted with durable stainless steel for reliable everyday hydration."],
  ["Double-wall insulation", "Designed to help maintain your drink's temperature, keeping it hot or cold for longer."],
  ["Splash-proof lid", "A convenient lid designed to help minimise accidental splashes while you're on the move."],
  ["Reusable metal straw", "Effortless sipping with the included metal straw."],
  ["Designed for everyday life", "A sleek, minimalist silhouette that fits effortlessly into your daily routine."],
];


export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const policy = getPolicy(product.fulfilment);
  const others = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `TINVO ${product.name} Tumbler`,
    description: product.description,
    image: product.images.map((i) => `/products/${i.file}`),
    brand: { "@type": "Brand", name: "TINVO" },
    material: "304 stainless steel",
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      // printed to order once checkout is live; pre-order until then
      availability: checkoutEnabled ? "https://schema.org/MadeToOrder" : "https://schema.org/PreOrder",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <div className="mx-auto grid max-w-[1500px] gap-10 px-5 pb-28 pt-8 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28">
        <ProductGallery product={product} className="lg:sticky lg:top-24 lg:self-start" />

        <div>
          <nav className="label flex items-center gap-2 text-dim">
            <Link href="/shop" className="wipe hover:text-chalk">
              Designs
            </Link>
            <span>/</span>
            <span style={{ color: product.accent }}>{product.finish}</span>
          </nav>

          <h1 className="display mt-6 text-[clamp(2.6rem,6vw,4.5rem)] text-chalk">
            {product.name}
          </h1>
          <p className="mt-3 text-[16px] text-ash">{product.tagline}</p>

          <div className="mt-6 flex items-baseline gap-4">
            <p className="font-mono text-3xl tracking-tight tabular-nums text-chalk">
              {formatPrice(product.price)}
            </p>
            <p className="label text-dim">
              {barrel.capacity} · {barrel.capacityMl} ml
            </p>
          </div>

          <div className="mt-9">
            <DesignPicker current={product} />
          </div>

          <div className="mt-9 grid items-start gap-3 sm:grid-cols-[1fr_auto]">
            {checkoutEnabled ? (
              <AddToCart slug={product.slug} accent={product.accent} />
            ) : (
              <span className="label flex items-center justify-center bg-chalk/10 px-8 py-4 text-ash">
                Checkout opens soon
              </span>
            )}
            <Link
              href={`/contact?design=${product.slug}`}
              className="label border hairline px-8 py-4 text-center text-chalk transition-colors hover:bg-chalk hover:text-void"
            >
              Ask about this design
            </Link>
          </div>

          {/* reassurance, right where the decision happens */}
          <ul className="mt-6 grid gap-x-6 gap-y-3 border-y hairline py-5 sm:grid-cols-3">
            {[
              ["Printed to order", "Made for you, after you buy"],
              [`${policy.reportWindowDays}-day fault cover`, "Damaged or misprinted? We put it right"],
              ["Ships across India", "Tracked, door to door"],
            ].map(([title, body]) => (
              <li key={title}>
                <p className="text-[14px] text-chalk">{title}</p>
                <p className="mt-1 text-[13px] leading-snug text-dim">{body}</p>
              </li>
            ))}
          </ul>

          <p className="mt-9 max-w-xl text-[15px] leading-relaxed text-ash">{product.description}</p>

          <section className="mt-12" aria-labelledby="details-heading">
            <h2 id="details-heading" className="label" style={{ color: product.accent }}>
              The details that matter
            </h2>
            <ul className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {details.map(([title, body]) => (
                <li key={title} className="border-t hairline pt-4">
                  <p className="text-[15px] text-chalk">{title}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ash">{body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[17px] text-chalk">
              Not just another tumbler. <span style={{ color: product.accent }}>A little more you, in every sip.</span>
            </p>
          </section>

          <section className="mt-12" aria-labelledby="box-heading">
            <h2 id="box-heading" className="label text-dim">
              In the box
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {[`${product.name} ${barrel.capacity} tumbler`, "Splash-proof lid", "Reusable metal straw"].map((item) => (
                <li key={item} className="border hairline px-4 py-2.5 text-[14px] text-chalk">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12" aria-labelledby="know-heading">
            <h2 id="know-heading" className="label text-dim">
              Good to know before you buy
            </h2>
            <ul className="mt-5 border-t hairline">
              {goodToKnow.map(([title, body]) => (
                <li key={title} className="grid gap-1 border-b hairline py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
                  <p className="text-[14px] text-chalk">{title}</p>
                  <p className="text-[14px] leading-relaxed text-ash">{body}</p>
                </li>
              ))}
            </ul>
            <Link href="/support/care" className="wipe label mt-5 inline-block text-ash hover:text-chalk">
              Full care guide →
            </Link>
          </section>

          <dl className="mt-12 border-t hairline">
            {[
              ["Capacity", `${barrel.capacity} (${barrel.capacityMl} ml)`],
              ["Body", barrel.material],
              ["Lid", barrel.lid],
              ["Print", barrel.print],
              ["Finish", product.finish],
              ["Origin", "Printed in India"],
            ].map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-6 border-b hairline py-4">
                <dt className="label text-dim">{key}</dt>
                <dd className="text-right text-[15px] text-chalk">{value}</dd>
              </div>
            ))}
          </dl>

          <ReturnsSummary fulfilment={product.fulfilment} />
        </div>
      </div>

      {/* mobile: price and next step stay in reach while scrolling */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-void/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] text-chalk">{product.name}</p>
            <p className="font-mono text-[13px] tabular-nums text-ash">{formatPrice(product.price)}</p>
          </div>
          {checkoutEnabled ? (
            <AddToCart slug={product.slug} accent={product.accent} className="shrink-0" />
          ) : (
            <Link
              href={`/contact?design=${product.slug}`}
              className="label shrink-0 px-5 py-3.5 text-void"
              style={{ backgroundColor: product.accent }}
            >
              Ask about it
            </Link>
          )}
        </div>
      </div>

      <section className="border-t hairline py-16 lg:py-24">
        <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
          <div className="flex items-baseline justify-between gap-6 border-b hairline pb-5">
            <span className="label" style={{ color: product.accent }}>
              You might also like
            </span>
            <Link href="/shop" className="wipe label text-ash hover:text-chalk">
              All {products.length} →
            </Link>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {others.map((other, i) => (
              <li key={other.slug}>
                <ProductCard product={other} index={i} sizes="(max-width: 1024px) 46vw, 23vw" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
