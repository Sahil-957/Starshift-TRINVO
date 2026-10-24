import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CollectionBar from "@/components/CollectionBar";
import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import {
  collectionProducts,
  collections,
  getCollection,
} from "@/data/collections";

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Not found" };
  return { title: collection.title, description: collection.lede };
}

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const matches = collectionProducts(collection);

  return (
    <>
      <PageHeader
        index={`${matches.length} ${matches.length === 1 ? "design" : "designs"}`}
        label={collection.label}
        title={collection.title}
        lede={collection.lede}
      />

      <section className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:pb-32">
        <CollectionBar active={collection.slug} />

        <ul className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-6">
          {matches.map((product, i) => (
            <Reveal as="li" key={product.slug} delay={(i % 4) * 60}>
              <ProductCard
                product={product}
                index={i}
                sizes="(max-width: 1024px) 46vw, 23vw"
              />
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-16 border-t hairline pt-8">
          <Link href="/shop" className="wipe label text-ash hover:text-chalk">
            See all designs &rarr;
          </Link>
        </Reveal>
      </section>
    </>
  );
}
