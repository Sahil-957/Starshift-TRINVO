import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { products } from "@/data/products";

export const metadata: Metadata = {
  title: "Designs",
  description: "Every TINVO design, in two sizes.",
};

export default function ShopPage() {
  return (
    <>
      <PageHeader
        index="01"
        label={`${products.length} designs`}
        title="Every design"
        lede="One barrel geometry, one set of specs, and eight different pieces of artwork printed full-wrap across it."
      />
      <section className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:pb-32">
        <ul className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product, i) => (
            <Reveal as="li" key={product.slug} delay={(i % 4) * 60}>
              <ProductCard
                product={product}
                index={i}
                sizes="(max-width: 640px) 46vw, (max-width: 1024px) 46vw, 23vw"
              />
            </Reveal>
          ))}
        </ul>
      </section>
    </>
  );
}
