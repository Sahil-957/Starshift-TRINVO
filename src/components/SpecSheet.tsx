import ProductFrame from "./ProductFrame";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { getProduct } from "@/data/products";

const subject = getProduct("midnight-steel")!;

/**
 * Claims here are deliberately descriptive rather than numeric — no insulation
 * hours or drop ratings until they are lab-verified.
 */
const spec = [
  ["Wall", "Double-wall stainless, vacuum gap"],
  ["Lid", "Press-fit, sliding sip closure"],
  ["Surface", "Full-wrap print, matte or gloss"],
  ["Artwork", "Drawn in-house, one design per barrel"],
  ["Volume", "350 ml / 600 ml"],
  ["Origin", "India"],
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
          lede="Everything that matters about a tumbler is decided before any artwork goes on it. The barrel is the same under every design."
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
            <Reveal>
              <dl className="border-t hairline">
                {spec.map(([key, value], i) => (
                  <div
                    key={key}
                    className="flex items-baseline justify-between gap-6 border-b hairline py-5"
                    style={{ "--reveal-delay": `${i * 50}ms` } as React.CSSProperties}
                  >
                    <dt className="label text-dim">{key}</dt>
                    <dd className="text-right text-[15px] text-chalk">{value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

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
          </div>
        </div>
      </div>
    </section>
  );
}
