import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ProductFrame from "@/components/ProductFrame";
import Reveal from "@/components/Reveal";
import { collectionGroups, collectionProducts } from "@/data/collections";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "The catalogue grouped by size, character and what you actually use it for.",
};

export default function CollectionsIndexPage() {
  return (
    <>
      <PageHeader
        index="02"
        label="Collections"
        title="Ways into the range"
        lede="The same eight designs, sorted three ways — by the size you need, by how loud the artwork is, and by where it is going to live."
      />

      <section className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:pb-32">
        {collectionGroups.map(({ group, items }, g) => (
          <div key={group} className={g ? "mt-20" : ""}>
            <p className="label border-b hairline pb-5 text-dim">By {group.toLowerCase()}</p>

            <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => {
                const matches = collectionProducts(item);
                return (
                  <Reveal as="li" key={item.slug} delay={i * 60}>
                    <Link href={`/collections/${item.slug}`} className="group block">
                      <div className="relative overflow-hidden">
                        <ProductFrame
                          product={matches[0]}
                          className="aspect-[16/10]"
                          sizes="(max-width: 1024px) 92vw, 30vw"
                        />
                        <span
                          className="label absolute left-4 top-4 z-[3]"
                          style={{ color: item.accent }}
                        >
                          {matches.length} designs
                        </span>
                      </div>

                      <h2 className="display mt-5 border-t hairline pt-4 text-xl text-chalk">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-[14px] leading-relaxed text-ash transition-colors group-hover:text-chalk">
                        {item.lede}
                      </p>
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        ))}

        <Reveal className="mt-20 border-t hairline pt-8">
          <Link
            href="/shop"
            className="label inline-block bg-chalk px-8 py-4 text-void transition-colors hover:bg-plum"
          >
            See all designs
          </Link>
        </Reveal>
      </section>
    </>
  );
}
