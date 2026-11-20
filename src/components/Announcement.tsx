"use client";

import Link from "next/link";
import { countdown, LAUNCH_LAST_DAY, LAUNCH_PRICE_LINE, useLaunchLeft, useOfferLine } from "./Launch";
import { shippingPromise } from "@/data/products";

const notes = [
  { text: "Make every sip your style", color: "var(--color-plum)" },
  { text: shippingPromise, color: "var(--color-cobalt)" },
  { text: "Made in India", color: "var(--color-jade)" },
  { text: "Double-wall stainless", color: "var(--color-bronze)" },
];

/**
 * Launch week: a solid bar with the countdown and the offer, linking to the
 * shop. After it: the hairline ticker (track doubled so the loop is seamless).
 */
export default function Announcement() {
  const left = useLaunchLeft();
  const offer = useOfferLine();

  if (left !== 0) {
    return (
      <Link href="/shop" className="relative z-50 block bg-bronze px-4 py-2.5 text-center text-void hover:bg-chalk">
        <span className="label inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 leading-normal">
          <span className="whitespace-nowrap">
            <b className="font-bold">Launch week</b> · <span className="tabular-nums">{left === null ? `ends ${LAUNCH_LAST_DAY}` : `ends in ${countdown(left)}`}</span>
          </span>
          <span className="whitespace-nowrap">{offer ?? LAUNCH_PRICE_LINE}</span>
          <span className="hidden whitespace-nowrap underline underline-offset-4 sm:inline">Shop now →</span>
        </span>
      </Link>
    );
  }

  const track = [...notes, ...notes];
  return (
    <div className="relative z-50 overflow-hidden border-b hairline bg-void py-2.5">
      <div className="flex w-max animate-drift gap-12 pr-12">
        {track.map((note, i) => (
          <span
            key={i}
            className="label flex shrink-0 items-center gap-4 whitespace-nowrap text-dim"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: note.color }}
            />
            {note.text}
          </span>
        ))}
      </div>
    </div>
  );
}
