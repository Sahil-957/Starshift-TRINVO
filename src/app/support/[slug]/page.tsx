import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import { getSupportPage, supportPages, type Section } from "@/data/support";

export function generateStaticParams() {
  return supportPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/support/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = getSupportPage(slug);
  if (!page) return { title: "Not found" };
  return { title: page.label, description: page.summary };
}

export default async function SupportDetailPage({
  params,
}: PageProps<"/support/[slug]">) {
  const { slug } = await params;
  const page = getSupportPage(slug);
  if (!page) notFound();

  const index = supportPages.findIndex((p) => p.slug === slug);
  const others = supportPages.filter((p) => p.slug !== slug);

  return (
    <>
      <PageHeader
        index={String(index + 1).padStart(2, "0")}
        label={page.label}
        title={page.title}
        lede={page.lede}
      />

      <div className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:pb-32">
        {page.provisional && (
          <p
            className="max-w-2xl border-l-2 py-1 pl-5 text-[14px] leading-relaxed text-ash"
            style={{ borderColor: page.accent }}
          >
            Figures on this page are provisional. Delivery windows, charges and
            lead times are confirmed once our courier and production contracts
            are signed, and ordering is not open yet.
          </p>
        )}

        <div className="mt-14 grid gap-x-16 gap-y-14 lg:grid-cols-[14rem_minmax(0,1fr)]">
          {/* contents rail */}
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="label text-dim">On this page</p>
            <ul className="mt-5 space-y-3">
              {page.sections.map((section) => (
                <li key={section.heading}>
                  <a
                    href={`#${slugify(section.heading)}`}
                    className="wipe text-[14px] leading-snug text-ash hover:text-chalk"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="max-w-2xl">
            {page.sections.map((section, i) => (
              <Reveal key={section.heading} delay={i * 60}>
                <SectionBlock section={section} accent={page.accent} />
              </Reveal>
            ))}

            <div className="mt-16 border-t hairline pt-8">
              <p className="text-[15px] leading-relaxed text-ash">
                Not answered here? Write to us and a person replies.
              </p>
              <Link
                href="/contact"
                className="label mt-6 inline-block border hairline px-8 py-4 text-chalk transition-colors hover:bg-chalk hover:text-void"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="border-t hairline py-16 lg:py-24">
        <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
          <p className="label border-b hairline pb-5 text-dim">More help</p>
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((other) => (
              <li key={other.slug}>
                <Link href={`/support/${other.slug}`} className="group block">
                  <span
                    className="label block border-t-2 pt-4"
                    style={{ borderColor: other.accent, color: other.accent }}
                  >
                    {other.label}
                  </span>
                  <span className="mt-3 block text-[14px] leading-relaxed text-ash transition-colors group-hover:text-chalk">
                    {other.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/** Anchor id for the contents rail — headings are short and unique per page. */
function slugify(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function SectionBlock({ section, accent }: { section: Section; accent: string }) {
  return (
    <section id={slugify(section.heading)} className="scroll-mt-24 pt-14 first:pt-0">
      <h2 className="display text-[clamp(1.5rem,3vw,2.1rem)] text-chalk">
        {section.heading}
      </h2>

      {section.body?.map((paragraph) => (
        <p key={paragraph} className="mt-5 text-[15px] leading-relaxed text-ash">
          {paragraph}
        </p>
      ))}

      {section.rows && (
        <dl className="mt-7 border-t hairline">
          {section.rows.map(([key, value]) => (
            <div
              key={key}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b hairline py-4"
            >
              <dt className="text-[15px] text-chalk">{key}</dt>
              <dd className="text-[15px] text-ash sm:text-right">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {section.points && (
        <ul className="mt-7 border-t hairline">
          {section.points.map((point) => (
            <li
              key={point}
              className="grid grid-cols-[auto_1fr] gap-4 border-b hairline py-4"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <span className="text-[15px] leading-relaxed text-ash">{point}</span>
            </li>
          ))}
        </ul>
      )}

      {section.qa && (
        <ul className="mt-7 border-t hairline">
          {section.qa.map((item) => (
            <li key={item.q} className="border-b hairline py-5">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-[15px] text-chalk marker:content-none">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="label shrink-0 transition-transform duration-300 group-open:rotate-45"
                    style={{ color: accent }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ash">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
