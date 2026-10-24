"use client";

import Link from "next/link";
import { useState } from "react";
import ProductFrame from "./ProductFrame";
import Swatches from "./Swatches";
import { formatPrice } from "@/data/products";
import {
  matchedTraits,
  quizQuestions,
  recommendProduct,
  type QuizAnswers,
} from "@/lib/quiz";

const traitCopy: Record<string, string> = {
  minimal: "Quiet design",
  bold: "High contrast",
  desk: "Desk-sized",
  commute: "Cup-holder ready",
  outdoors: "Built for outside",
  travel: "Travels well",
  gift: "Gifts well",
  small: "350 ml",
  large: "600 ml",
  dark: "Dark ground",
  light: "Light ground",
  warm: "Warm tones",
  mono: "Monochrome",
  earth: "Earth palette",
  cool: "Cool palette",
};

/** One colour per step, so the progress bar fills through the palette. */
const stepColors = [
  "var(--color-cobalt)",
  "var(--color-plum)",
  "var(--color-rose)",
  "var(--color-jade)",
];

export default function Configurator() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});

  const total = quizQuestions.length;
  const done = step >= total;
  const question = done ? null : quizQuestions[step];
  const result = done ? recommendProduct(answers) : null;

  const choose = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setStep((s) => s + 1);
  };

  return (
    <section
      id="configurator"
      className="ambient scroll-mt-20 border-t hairline bg-panel py-20 lg:py-32"
      style={{ "--accent": "var(--color-jade)", "--ax": "78%" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8">
        <div className="flex items-baseline justify-between gap-6 border-b hairline pb-5">
          <span className="label text-jade">04 — Configurator</span>
          <span className="label tabular-nums text-dim">
            {done ? "Complete" : `${String(step + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
          </span>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* framing + progress */}
          <div>
            <h2 className="display max-w-[11ch] text-[clamp(2.4rem,6.5vw,4.75rem)] text-chalk">
              Find your design
            </h2>
            <p className="mt-7 max-w-sm text-[15px] leading-relaxed text-ash">
              Eight designs is seven too many to choose between. Four questions
              and we narrow it to one.
            </p>

            <div className="mt-12 flex gap-1.5">
              {quizQuestions.map((q, i) => (
                <span
                  key={q.id}
                  className="h-0.5 flex-1 transition-colors duration-500"
                  style={{
                    backgroundColor:
                      i < step ? stepColors[i % stepColors.length] : "rgba(242,241,238,0.12)",
                  }}
                />
              ))}
            </div>

            {step > 0 && !done && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="wipe label mt-8 text-dim hover:text-chalk"
              >
                ← Back
              </button>
            )}
          </div>

          {/* question or result */}
          <div>
            {question && (
              <div key={question.id} className="animate-sweep">
                <p className="text-[clamp(1.4rem,3vw,2rem)] leading-tight text-chalk">
                  {question.prompt}
                </p>
                <p className="mt-3 text-[14px] text-dim">{question.caption}</p>

                <ul className="mt-10 border-t hairline">
                  {question.options.map((option, i) => (
                    <li key={option.id} className="border-b hairline">
                      <button
                        type="button"
                        onClick={() => choose(question.id, option.id)}
                        className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-5 text-left transition-colors hover:text-chalk"
                      >
                        <span
                          className="label text-dim transition-colors group-hover:text-[var(--opt)]"
                          style={{ "--opt": stepColors[i % stepColors.length] } as React.CSSProperties}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <span className="block text-[17px] text-chalk">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-[14px] text-ash">
                            {option.hint}
                          </span>
                        </span>
                        <span className="label text-dim transition-transform duration-300 group-hover:translate-x-1 group-hover:text-chalk">
                          →
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result && (
              <div className="animate-sweep">
                <p className="label text-dim">Your match</p>

                <div className="mt-6 grid gap-7 sm:grid-cols-[13rem_1fr] sm:items-start">
                  <ProductFrame
                    product={result}
                    className="aspect-[4/5]"
                    sizes="(max-width: 640px) 90vw, 13rem"
                  />

                  <div>
                    <h3 className="display text-4xl text-chalk">{result.name}</h3>
                    <p className="mt-3 text-[15px] text-ash">{result.tagline}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <p className="label tabular-nums text-chalk">
                        {formatPrice(result.price)} · {result.capacityMl} ml
                      </p>
                      <Swatches palette={result.palette} />
                    </div>

                    <ul className="mt-7 flex flex-wrap gap-2">
                      {matchedTraits(answers, result).map((trait) => (
                        <li
                          key={trait}
                          className="label border px-3 py-2 text-ash"
                          style={{ borderColor: `color-mix(in oklab, ${result.accent} 45%, transparent)` }}
                        >
                          {traitCopy[trait] ?? trait}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-9 flex flex-wrap gap-3">
                      <Link
                        href={`/shop/${result.slug}`}
                        className="label px-7 py-4 text-void transition-opacity hover:opacity-85"
                        style={{ backgroundColor: result.accent }}
                      >
                        See {result.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setAnswers({});
                          setStep(0);
                        }}
                        className="label border hairline px-7 py-4 text-chalk transition-colors hover:bg-chalk hover:text-void"
                      >
                        Start over
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
