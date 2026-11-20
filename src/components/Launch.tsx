"use client";

import { useSyncExternalStore } from "react";
import { formatPrice, multiBuy, multiBuyLine, percentOff, products, type Product } from "@/data/products";

/**
 * Launch week: on until midnight at the end of Thursday 26 Nov 2026, IST. The
 * launch bits switch themselves off in the browser at that moment, so nothing
 * stale (a finished countdown, an ended offer) stays up. Pages render the
 * launch version and hide it after the deadline; remove these after launch.
 */
export const LAUNCH_ENDS = Date.parse("2026-11-27T00:00:00+05:30");
/** The last day, for copy */
export const LAUNCH_LAST_DAY = "26 Nov";
/** The price from 27 Nov, for "launch price" copy; change it if the plan changes */
export const PRICE_AFTER_LAUNCH = 1049;
/** "₹949 launch price · ₹1,049 from 27 Nov" */
export const LAUNCH_PRICE_LINE = `${formatPrice(Math.min(...products.map((p) => p.price)))} launch price · ${formatPrice(PRICE_AFTER_LAUNCH)} from 27 Nov`;

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

/** The time left as big digits: 06 days 08 hrs 32 min 24 sec. */
export function Clock({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="label text-ash">Ends {LAUNCH_LAST_DAY}</span>;
  const s = Math.floor(ms / 1000);
  const parts = [
    [Math.floor(s / 86400), "days"],
    [Math.floor(s / 3600) % 24, "hrs"],
    [Math.floor(s / 60) % 60, "min"],
    [s % 60, "sec"],
  ] as const;
  return (
    <span role="timer" className="flex items-start gap-3">
      {parts.map(([n, unit]) => (
        <span key={unit} className="text-center">
          <span className="block font-mono text-[22px] leading-none tabular-nums text-chalk">{String(n).padStart(2, "0")}</span>
          <span className="label mt-1.5 block text-[9px] text-dim">{unit}</span>
        </span>
      ))}
    </span>
  );
}

/** The price, then the MRP struck through and the % off, when the MRP is higher. */
export function Price({ product, large = false }: { product: Product; large?: boolean }) {
  const off = percentOff(product);
  if (!off) return <>{formatPrice(product.price)}</>;
  const small = large ? "text-[0.5em] tracking-normal" : "";
  return (
    <>
      {formatPrice(product.price)}{" "}
      <span className={`whitespace-nowrap text-dim ${small}`}>
        MRP <s>{formatPrice(product.compareAt!)}</s>
      </span>{" "}
      <span className={`whitespace-nowrap text-jade ${small}`}>{off}% off</span>
    </>
  );
}

/** "Just launched · " ahead of a card's meta line. */
export function LaunchTag({ accent }: { accent: string }) {
  if (!useLaunchLive()) return null;
  return <span style={{ color: accent }}>Just launched · </span>;
}

/** Under a product's price in launch week: the launch price, and the multi-buy offer while it is on. */
export function OfferNote({ accent }: { accent: string }) {
  const live = useLaunchLive();
  const line = useOfferLine();
  if (!live) return null;
  return (
    <p className="label mt-3 text-[11px] leading-relaxed" style={{ color: accent }}>
      Launch price till {LAUNCH_LAST_DAY} · {formatPrice(PRICE_AFTER_LAUNCH)} from 27 Nov
      {line && (
        <>
          <br />
          {line} · mix any designs
        </>
      )}
    </p>
  );
}
