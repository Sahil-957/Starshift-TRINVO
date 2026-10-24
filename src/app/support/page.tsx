import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import { supportPages } from "@/data/support";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Shipping, returns and refunds, care instructions, bulk orders and answers to the questions we actually get.",
};

export default function SupportPage() {
  return (
    <>
      <PageHeader
        index="00"
        label="Support"
        title="Everything else you need to know"
        lede="How it ships, how to send it back, how to keep it alive, and how to order a hundred of them."
      />

      <section className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:pb-32">
        <ul className="border-t hairline">
          {supportPages.map((page, i) => (
            <Reveal as="li" key={page.slug} delay={i * 60}>
              <Link
                href={`/support/${page.slug}`}
                className="group grid gap-x-14 gap-y-3 border-b hairline py-9 lg:grid-cols-[auto_0.8fr_1.2fr]"
              >
                <span className="label" style={{ color: page.accent }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="display text-[clamp(1.5rem,3vw,2.1rem)] text-chalk">
                  {page.label}
                </h2>
                <span className="max-w-xl text-[15px] leading-relaxed text-ash transition-colors group-hover:text-chalk">
                  {page.summary}
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-14">
          <p className="max-w-xl text-[15px] leading-relaxed text-ash">
            Anything these pages do not cover, ask us directly — enquiries go
            to a person, not a ticket queue.
          </p>
          <Link
            href="/contact"
            className="label mt-7 inline-block bg-chalk px-8 py-4 text-void transition-colors hover:bg-plum"
          >
            Contact us
          </Link>
        </Reveal>
      </section>
    </>
  );
}
