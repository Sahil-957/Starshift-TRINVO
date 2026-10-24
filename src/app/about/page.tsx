import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Studio",
  description: "Why TRINVO makes one barrel and puts all of its effort into the artwork.",
};

const chapters = [
  {
    heading: "One barrel, done properly",
    body: "Most of what separates a good tumbler from a bad one happens before any colour is applied: wall thickness, the vacuum gap, how the lid seats, whether the base clears a keyboard tray. We settled that once and then stopped changing it.",
  },
  {
    heading: "The artwork is the product",
    body: "Most tumblers are sold on a colour chart: three finishes, because three is what fits on a pallet. We treat the surface as the actual design work — every piece in the range is drawn from scratch, not picked out of a library of stock patterns.",
  },
  {
    heading: "Finished pieces, not blanks",
    body: "We are not asking you to decorate anything. Each design arrives complete, printed full-wrap, chosen the way you would choose a print for a wall. Personalisation may come later, but it is not what this range is for.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        index="01"
        label="Studio"
        title="We only make one thing"
        lede="TRINVO is a tumbler brand with a deliberately narrow product line and all of its effort pointed at the artwork."
      />

      <section className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:pb-32">
        <ul className="border-t hairline">
          {chapters.map((chapter, i) => (
            <Reveal as="li" key={chapter.heading} delay={i * 70}>
              <div className="grid gap-5 border-b hairline py-10 lg:grid-cols-[auto_0.9fr_1.1fr] lg:gap-14">
                <span className="label text-plum">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="display text-[clamp(1.6rem,3.4vw,2.4rem)] text-chalk">
                  {chapter.heading}
                </h2>
                <p className="max-w-xl text-[15px] leading-relaxed text-ash">
                  {chapter.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-14">
          <Link
            href="/shop"
            className="label inline-block bg-chalk px-8 py-4 text-void transition-colors hover:bg-plum"
          >
            See the designs
          </Link>
        </Reveal>
      </section>
    </>
  );
}
