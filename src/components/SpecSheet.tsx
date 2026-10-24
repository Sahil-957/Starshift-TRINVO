import Link from "next/link";
import ProductFrame from "./ProductFrame";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { getProduct } from "@/data/products";

const subject = getProduct("midnight-steel")!;

/**
 * Claims here are deliberately descriptive rather than numeric — no insulation
 * hours or drop ratings until they are lab-verified. Dimensions marked
 * provisional are confirmed against the supplier template before launch.
 */
const groups: { title: string; rows: [string, string][] }[] = [
  {
    title: "Materials",
    rows: [
      ["Body", "304 stainless, double wall"],
      ["Insulation", "Sealed vacuum gap"],
      ["Lid", "Splash-proof, push-on"],
      ["Straw", "Reusable metal, included"],
      ["Surface", "Sublimation, full wrap"],
      ["Inks", "OEKO-TEX certified, fade-proof"],
    ],
  },
  {
    title: "Size and fit",
    rows: [
      ["Capacity", "20 oz (591 ml)"],
      ["Sizes", "One — there is no second size"],
      ["Height and diameter", "Not published by the supplier yet"],
      ["Weight", "Not published by the supplier yet"],
    ],
  },
  {
    title: "Behind it",
    rows: [
      ["Artwork", "Drawn in-house, one design per barrel"],
      ["Origin", "Made in India"],
      ["Made", "To order, after you buy it"],
      ["Faults", "Reportable within 7 days of delivery"],
    ],
  },
];

export default function SpecSheet() {
  return (
    <section
      id="spec"
      className="ambient scroll-mt-20 border-t hairline py-20 lg:py-32"
      style={{ "--accent": "var(--color-cobalt)", "--ax": "12%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <SectionHead
          index="03"
          label="Specification"
          accent="var(--color-cobalt)"
          title="What is actually in your hand"
          lede="Everything that matters about a tumbler is decided before any artwork goes on it — the steel, the vacuum seal, how the lid seats. There is one barrel at one size, and it is identical under every design."
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <Reveal>
            <ProductFrame
              product={subject}
              className="aspect-[4/5]"
              sizes="(max-width: 1024px) 90vw, 42vw"
              lightY="30%"
            />
          </Reveal>

          <div>
            {groups.map((group, g) => (
              <Reveal key={group.title} delay={g * 60} className={g ? "mt-12" : ""}>
                <p className="label text-cobalt">{group.title}</p>
                <dl className="mt-5 border-t hairline">
                  {group.rows.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b hairline py-4"
                    >
                      <dt className="label text-dim">{key}</dt>
                      <dd className="text-[15px] text-chalk sm:text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            ))}

            <Reveal delay={160} className="mt-14 border-t hairline pt-8">
              <p className="label text-dim">The practical side</p>
              <ul className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
                {[
                  ["/support/shipping", "Shipping"],
                  ["/support/returns", "Returns & refunds"],
                  ["/support/care", "Care guide"],
                  ["/support/faq", "FAQ"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="wipe text-[15px] text-ash hover:text-chalk">
                      {label} &rarr;
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
