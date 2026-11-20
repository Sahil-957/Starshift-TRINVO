"use client";

import { useSyncExternalStore } from "react";
import { formatPrice, multiBuy, multiBuyLine, type Product } from "@/data/products";

/**
 * Launch week: on until midnight at the end of Thursday 26 Nov 2026, IST. The
 * launch bits switch themselves off in the browser at that moment, so nothing
 * stale (a finished countdown, an ended offer) stays up. Pages render the
 * launch version and hide it after the deadline; remove these after launch.
 */
export const LAUNCH_ENDS = Date.parse("2026-11-27T00:00:00+05:30");
/** The last day, for copy */
export const LAUNCH_LAST_DAY = "26 Nov";

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = Date.now();
    listeners.forEach((l) => l());
  }, 1000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** The time, ticking each second; null while rendering on the server. */
const useNow = () => useSyncExternalStore(subscribe, () => now, () => null);

/** Milliseconds left in the launch week; null while rendering on the server. */
export function useLaunchLeft(): number | null {
  const t = useNow();
  return t === null ? null : Math.max(0, LAUNCH_ENDS - t);
}

export const useLaunchLive = () => useLaunchLeft() !== 0;

/** "Buy 2, save ₹200 · Buy 3+, save ₹400" while the admin's multi-buy offer is on, else null. */
export function useOfferLine() {
  const t = useNow();
  return multiBuy && (t === null || t < multiBuy.endsAt) ? multiBuyLine! : null;
}

/** "2d 11h 04m 09s" */
export function countdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 86400)}d ${pad(Math.floor(s / 3600) % 24)}h ${pad(Math.floor(s / 60) % 60)}m ${pad(s % 60)}s`;
}

/** The price, with the MRP (the admin's "compare at") struck through when it is higher. */
export function Price({ product, large = false }: { product: Product; large?: boolean }) {
  if (!product.compareAt || product.compareAt <= product.price) return <>{formatPrice(product.price)}</>;
  return (
    <>
      {formatPrice(product.price)}{" "}
      <span className={`text-dim ${large ? "text-[0.5em] tracking-normal" : ""}`}>
        MRP <s>{formatPrice(product.compareAt)}</s>
      </span>
    </>
  );
}

/** "Just launched · " ahead of a card's meta line. */
export function LaunchTag({ accent }: { accent: string }) {
  if (!useLaunchLive()) return null;
  return <span style={{ color: accent }}>Just launched · </span>;
}

/** The multi-buy offer under a product's price, while it is on. */
export function OfferNote({ accent }: { accent: string }) {
  const line = useOfferLine();
  if (!line) return null;
  return (
    <p className="label mt-3 text-[11px] leading-relaxed" style={{ color: accent }}>
      Launch week: {line} · mix any designs
    </p>
  );
}
