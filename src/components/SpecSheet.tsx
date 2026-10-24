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
      ["Interior", "Bare steel, no inner coating"],
      ["Lid", "Press-fit, sliding sip closure"],
      ["Gasket", "Food-grade silicone, removable"],
      ["Surface", "Full-wrap print, matte or gloss"],
    ],
  },
  {
    title: "Size and fit",
    rows: [
      ["Volume", "350 ml / 600 ml"],
      ["Base", "Narrow enough to clear a keyboard tray"],
      ["Cup holder", "Both sizes fit a standard car holder"],
      ["Opening", "Wide enough for ice and a bottle brush"],
    ],
  },
  {
    title: "In use",
    rows: [
      ["Hot and cold retention", "Not published until lab-tested"],
      ["Leak resistance", "Holds upright in a bag, closure shut"],
      ["Outer wall", "Stays dry — a vacuum wall does not sweat"],
      ["Washing", "Hand wash only; never the dishwasher"],
    ],
  },
  {
    title: "Behind it",
    rows: [
      ["Artwork", "Drawn in-house, one design per barrel"],
      ["Origin", "Made in India"],
      ["Warranty", "12 months on manufacturing defects"],
      ["Returns", "7 days, unused and boxed"],
    ],
  },
];

const useCases = [
  ["08:10", "The commute", "Fits a car cup holder and a crowded metro grip."],
  ["10:30", "The desk", "Narrow base, so it clears a keyboard tray."],
  ["18:45", "The session", "One fill covers a full class or a long walk."],
  ["Any", "The gift", "Arrives as an object someone did not have to choose."],
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
          lede="Everything that matters about a tumbler is decided before any artwork goes on it — the steel, the vacuum seal, how the lid seats, whether it fits where you put it. The barrel is the same under every design."
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

            <Reveal delay={120} className="mt-14">
              <p className="label text-dim">A day with it</p>
              <ul className="mt-6 border-t hairline">
                {useCases.map(([time, place, note]) => (
                  <li
                    key={place}
                    className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 border-b hairline py-5 sm:grid-cols-[4rem_9rem_1fr]"
                  >
                    <span className="label tabular-nums text-cobalt">{time}</span>
                    <span className="text-[15px] text-chalk">{place}</span>
                    <span className="col-span-2 text-[14px] leading-relaxed text-ash sm:col-span-1">
                      {note}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={160} className="mt-14 border-t hairline pt-8">
              <p className="label text-dim">The practical side</p>
              <ul className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
                {[
                  ["/support/shipping", "Shipping"],
                  ["/support/returns", "Returns & warranty"],
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
