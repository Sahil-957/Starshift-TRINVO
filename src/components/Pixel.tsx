"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { cookieChoice, onCookieChoice, PIXEL_ID, setCookieChoice, track } from "@/lib/pixel";

/** PageView on every page, including moves within the site. Lives in the root layout. */
export function PixelPageViews() {
  const path = usePathname();
  useEffect(() => {
    track("PageView");
  }, [path]);
  return null;
}

/** ViewContent on a product page. */
export function PixelViewContent({ slug, name, price }: { slug: string; name: string; price: number }) {
  useEffect(() => {
    track("ViewContent", { content_ids: [slug], content_name: name, content_type: "product", value: price, currency: "INR" });
  }, [slug, name, price]);
  return null;
}

/** Purchase on the thank-you page, once per order: reloading the page doesn't count it again. */
export function PixelPurchase({ number, value, items }: { number: string; value: number; items: { slug: string; quantity: number }[] }) {
  useEffect(() => {
    try {
      const key = `tinvo-pixel-${number}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // storage blocked: count it anyway; the order number lets Meta drop a repeat
    }
    track(
      "Purchase",
      {
        value,
        currency: "INR",
        content_type: "product",
        content_ids: items.map((i) => i.slug),
        contents: items.map((i) => ({ id: i.slug, quantity: i.quantity })),
        num_items: items.reduce((s, i) => s + i.quantity, 0),
      },
      number,
    );
  }, [number, value, items]);
  return null;
}

/** The visitor's cookie choice; "unknown" while rendering on the server. */
const useCookieChoice = () => useSyncExternalStore(onCookieChoice, cookieChoice, () => "unknown");

/** Bottom notice until the visitor picks OK or Turn off. Shown only while the Pixel is set up. */
export function CookieNotice() {
  const choice = useCookieChoice();
  if (!PIXEL_ID || choice !== null) return null;
  return (
    <div role="region" aria-label="Cookie notice" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg border hairline bg-panel/95 p-4 shadow-2xl backdrop-blur sm:p-5">
      <p className="text-[14px] leading-relaxed text-ash">
        We use cookies to measure our Facebook and Instagram ads.{" "}
        <Link href="/support/privacy" className="text-chalk underline underline-offset-4">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => setCookieChoice("yes")} className="label bg-chalk px-6 py-3 text-void hover:bg-bronze">
          OK
        </button>
        <button type="button" onClick={() => setCookieChoice("no")} className="label border hairline px-6 py-3 text-ash hover:text-chalk">
          Turn off
        </button>
      </div>
    </div>
  );
}

/** Footer link that brings the cookie notice back. */
export function CookieChoices() {
  if (!PIXEL_ID) return null;
  return (
    <button type="button" onClick={() => setCookieChoice(null)} className="label text-dim hover:text-chalk">
      Cookie choices
    </button>
  );
}
