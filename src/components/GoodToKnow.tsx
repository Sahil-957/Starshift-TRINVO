import Link from "next/link";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { goodToKnow } from "@/data/products";

/**
 * The plain truths most tumbler listings skip, and most returns come from.
 * Stated up front so nobody is surprised after the parcel opens.
 */
export default function GoodToKnow() {
  return (
    <section
      id="good-to-know"
      className="ambient scroll-mt-20 border-t hairline py-20 lg:py-32"
      style={{ "--accent": "var(--color-bronze)", "--ax": "85%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <SectionHead
          index="05"
          label="Good to know"
          accent="var(--color-bronze)"
          title="What other stores don't tell you"
          lede="Four things worth knowing before you buy any straw tumbler, ours included. Most bad reviews come from not being told."
        />

        <ul className="mt-14 grid gap-px bg-chalk/10 sm:grid-cols-2 lg:grid-cols-4">
          {goodToKnow.map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i * 70} className="bg-void p-7 lg:p-8">
              <span className="label text-bronze">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-6 text-[19px] leading-snug text-chalk">{title}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ash">{body}</p>
            </Reveal>
          ))}
        </ul>

        <Link href="/support/care" className="wipe label mt-10 inline-block text-ash hover:text-chalk">
          Read the full care guide →
        </Link>
      </div>
    </section>
  );
}
