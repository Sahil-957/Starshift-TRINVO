import Image from "next/image";
import Link from "next/link";
import Reveal from "./Reveal";
import { products, siteImages } from "@/data/products";

export default function Manifesto() {
  return (
    <section
      id="manifesto"
      className="grain relative isolate scroll-mt-20 overflow-hidden border-t hairline"
    >
      {siteImages.manifesto ? (
        <Image
          src={`/products/${siteImages.manifesto}`}
          alt=""
          fill
          sizes="100vw"
          className="z-0 object-cover opacity-35"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(55% 70% at 80% 30%, rgba(155,108,232,0.22) 0%, transparent 68%), radial-gradient(45% 60% at 12% 85%, rgba(208,80,122,0.16) 0%, transparent 70%)",
          }}
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 z-[1] bg-void/68" />

      <div className="relative z-[2] mx-auto max-w-[1500px] px-5 py-24 sm:px-8 lg:py-36">
        <Reveal>
          <span className="label text-plum">05 — Why we draw them</span>
        </Reveal>

        <Reveal delay={80}>
          <blockquote className="mt-10 max-w-4xl text-[clamp(1.5rem,3.8vw,2.9rem)] font-medium leading-[1.18] tracking-[-0.02em] text-chalk">
            A tumbler is the most-looked-at object on a desk, and almost every
            one of them is either blank or covered in something nobody chose.
            We draw ours the way you would draw a record sleeve.
          </blockquote>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-12 grid max-w-3xl gap-8 border-t hairline pt-8 sm:grid-cols-2">
            <p className="text-[15px] leading-relaxed text-ash">
              TINVO makes a single barrel properly — stainless,
              double-walled, honest geometry — and then treats the surface as
              the real work. {products.length} designs so far, each one drawn
              from scratch rather than pulled from a catalogue of stock
              patterns.
            </p>
            <p className="text-[15px] leading-relaxed text-ash">
              The rest is the unglamorous half: 304 stainless, a vacuum wall
              that does not sweat, a lid you can strip and wash, a warranty
              that covers the parts that actually fail, and a spec sheet that
              stays quiet about anything we have not measured.
            </p>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <Link href="/about" className="wipe label mt-10 inline-block text-chalk">
            Read the long version →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
