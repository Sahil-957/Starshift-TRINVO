"use client";

import { useSyncExternalStore } from "react";

/**
 * The cart: slugs and quantities in localStorage, shared across tabs. Prices
 * shown here are for display only; the admin re-prices every order.
 */
export type CartLine = { slug: string; quantity: number };

const KEY = "tinvo-cart";
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((l) => typeof l?.slug === "string" && l.quantity > 0) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // private mode / storage blocked: the cart still works for this page view
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);

export const cart = {
  add(slug: string, quantity = 1) {
    const lines = read();
    const hit = lines.find((l) => l.slug === slug);
    write(
      hit
        ? lines.map((l) => (l.slug === slug ? { ...l, quantity: Math.min(10, l.quantity + quantity) } : l))
        : [...lines, { slug, quantity }],
    );
  },
  set(slug: string, quantity: number) {
    write(
      quantity <= 0
        ? read().filter((l) => l.slug !== slug)
        : read().map((l) => (l.slug === slug ? { ...l, quantity: Math.min(10, quantity) } : l)),
    );
  },
  clear() {
    write([]);
  },
};
