import Link from "next/link";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { reviews } from "@/data/products";

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-[13px] text-bronze">
      {"\u2605".repeat(rating)}
      <span className="text-chalk/15">{"\u2605".repeat(5 - rating)}</span>
    </span>
  );
}

/**
 * Renders real reviews once `reviews` in data/products.ts is populated with
 * verified purchases. Until then it shows an honest empty state rather than
 * placeholder testimonials.
 */
export default function Reviews() {
  const count = reviews.length;
  const average = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  return (
    <section
      id="reviews"
      className="ambient scroll-mt-20 border-t hairline py-20 lg:py-32"
      style={{ "--accent": "var(--color-jade)", "--ax": "88%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <SectionHead
          index="06"
          label="Owners"
          accent="var(--color-jade)"
          title="Reviews, verified orders only"
          lede={
            count > 0
              ? `${average.toFixed(1)} average across ${count} verified order${count === 1 ? "" : "s"}.`
              : undefined
          }
        />

        {count === 0 ? (
          <Reveal className="mt-14">
            <div className="border hairline p-8 sm:p-14">
              <div className="max-w-2xl">
                <p className="label text-jade">Empty by design</p>
                <h3 className="display mt-7 text-[clamp(1.6rem,4vw,2.75rem)] text-chalk">
                  No reviews yet, and we are not inventing any
                </h3>
                <p className="mt-6 text-[15px] leading-relaxed text-ash">
                  This space is reserved for people who have actually bought a
                  TINVO barrel. Every review published here will be tied to
                  a verified order, with the colourway and size it was written
                  about. The first ones go up as soon as the first orders land.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link
                    href="/shop"
                    className="label bg-chalk px-7 py-4 text-void transition-colors hover:bg-jade"
                  >
                    Be the first
                  </Link>
                  <Link
                    href="/contact"
                    className="label border hairline px-7 py-4 text-chalk transition-colors hover:bg-chalk hover:text-void"
                  >
                    Already own one?
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        ) : (
          <ul className="mt-14 grid gap-px border hairline bg-chalk/10 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, i) => (
              <Reveal as="li" key={review.id} delay={(i % 3) * 70}>
                <article className="flex h-full flex-col bg-void p-7">
                  <Stars rating={review.rating} />
                  <h3 className="display mt-5 text-xl text-chalk">
                    {review.title}
                  </h3>
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ash">
                    {review.body}
                  </p>
                  <footer className="mt-7 flex items-center justify-between border-t hairline pt-4">
                    <span className="label text-chalk">{review.author}</span>
                    {review.verified && (
                      <span className="label text-bronze">Verified</span>
                    )}
                  </footer>
                </article>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
