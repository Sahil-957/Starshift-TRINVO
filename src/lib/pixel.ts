/**
 * Meta Pixel. The ID is from Events Manager (the TINVO dataset) and isn't a
 * secret. Empty means off: nothing loads, and the privacy policy says so.
 */
export const PIXEL_ID = "1711541817334907";

/**
 * The visitor's choice on the cookie notice: "yes", "no" or null (not chosen yet).
 * ponytail: opt-out (the Pixel runs until "no") while India's DPDP consent rules
 * aren't in force (about May 2027). To make it opt-in, change `!== "no"` in on() to `=== "yes"`.
 */
const CHOICE = "tinvo-cookies";
let remembered: string | null = null; // when storage is blocked
export function cookieChoice(): string | null {
  try {
    return localStorage.getItem(CHOICE) ?? remembered;
  } catch {
    return remembered;
  }
}
export function setCookieChoice(v: "yes" | "no" | null) {
  remembered = v;
  try {
    if (v) localStorage.setItem(CHOICE, v);
    else localStorage.removeItem(CHOICE);
  } catch {}
  const w = window as unknown as { fbq?: Fbq };
  if (v === "no") {
    w.fbq?.("consent", "revoke");
    // Meta's cookies live on starshift.in, not just this host
    const site = location.hostname.split(".").slice(-2).join(".");
    for (const name of ["_fbp", "_fbc"]) {
      document.cookie = `${name}=; max-age=0; path=/`;
      document.cookie = `${name}=; max-age=0; path=/; domain=.${site}`;
    }
  } else if (v === "yes") w.fbq?.("consent", "grant");
  window.dispatchEvent(new Event(CHOICE));
}
export function onCookieChoice(listener: () => void) {
  window.addEventListener(CHOICE, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHOICE, listener);
    window.removeEventListener("storage", listener);
  };
}

const on = () =>
  !!PIXEL_ID && process.env.NODE_ENV === "production" && typeof window !== "undefined" && cookieChoice() !== "no";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

/** Meta's base code: a stub that queues calls until fbevents.js arrives, so no event is lost on the first page. */
function fbq(...args: unknown[]) {
  if (!on()) return;
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (!w.fbq) {
    const n = function (...a: unknown[]) {
      if (n.callMethod) n.callMethod(...a);
      else n.queue.push(a);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    n.disablePushState = true; // we send PageView on each page ourselves; stops Meta counting moves twice
    w.fbq = n;
    w._fbq ??= n;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    n("init", PIXEL_ID);
  }
  w.fbq(...args);
}

/** A standard event (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase). `eventId` lets Meta drop duplicates. */
export function track(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (eventId) fbq("track", event, params, { eventID: eventId });
  else fbq("track", event, params);
}
