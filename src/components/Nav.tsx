"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { collections } from "@/data/collections";
import { formatPrice, products, type Product } from "@/data/products";
import { useCart } from "@/lib/cart";

type Menu = "shop" | "collections" | null;

const links: { href: string; label: string; menu?: Exclude<Menu, null> }[] = [
  { href: "/shop", label: "Shop", menu: "shop" },
  { href: "/collections", label: "Collections", menu: "collections" },
  { href: "/#configurator", label: "Find yours" },
  { href: "/#spec", label: "Spec" },
  { href: "/about", label: "Studio" },
  { href: "/support", label: "Support" },
];

const foil = products.filter((p) => p.finish === "Liquid foil");
const solid = products.filter((p) => p.finish === "Solid colour");

/** The tumbler cut out of its studio shot (same mask as the hero rail). */
function Cutout({ p, className = "" }: { p: Product; className?: string }) {
  const cut = `url(/products/mask/${p.slug}.png)`;
  return (
    <span className={`relative block ${className}`}>
      <Image
        src={`/products/${p.images[0].file}`}
        alt=""
        fill
        sizes="96px"
        className="origin-[50%_54%] scale-[1.4] object-cover"
        style={{
          maskImage: cut,
          WebkitMaskImage: cut,
          maskSize: "cover",
          WebkitMaskSize: "cover",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
    </span>
  );
}

function Bottle({
  p,
  onPick,
  onHover,
}: {
  p: Product;
  onPick: () => void;
  onHover: () => void;
}) {
  return (
    <Link
      href={`/shop/${p.slug}`}
      onClick={onPick}
      onPointerEnter={onHover}
      onFocus={onHover}
      className="group/b relative flex flex-col items-center rounded-sm px-1 pb-3 pt-4 outline-none transition-colors hover:bg-chalk/[0.04] focus-visible:bg-chalk/[0.06]"
    >
      <span
        aria-hidden
        className="absolute bottom-12 left-1/2 h-8 w-14 -translate-x-1/2 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover/b:opacity-70 group-focus-visible/b:opacity-70"
        style={{ backgroundColor: p.tone }}
      />
      <Cutout
        p={p}
        className="h-24 w-12 transition-transform duration-500 group-hover/b:-translate-y-1.5"
      />
      <span className="mt-3 text-center text-[13px] leading-tight text-chalk">
        {p.name}
      </span>
      <span className="mt-1 font-mono text-[11px] text-dim">
        {formatPrice(p.price)}
      </span>
    </Link>
  );
}

const icon =
  "relative flex h-10 w-10 items-center justify-center border hairline text-ash transition-colors hover:border-chalk/40 hover:text-chalk";

function CartButton() {
  const count = useCart().reduce((n, l) => n + l.quantity, 0);
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className={icon}
    >
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bronze px-1 font-mono text-[10px] text-void">
          {count}
        </span>
      )}
    </Link>
  );
}

function AccountButton() {
  return (
    <Link href="/account" aria-label="My account" className={icon}>
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c1.2-3.5 3.8-5.2 7-5.2s5.8 1.7 7 5.2" />
      </svg>
    </Link>
  );
}

export default function Nav({ checkout = false }: { checkout?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false); // phone menu
  const [menu, setMenu] = useState<Menu>(null); // desktop panel
  const [lead, setLead] = useState(
    products.find((p) => p.featured) ?? products[0],
  );
  const [solidBar, setSolidBar] = useState(false);
  const [tucked, setTucked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const headerRef = useRef<HTMLElement>(null);

  // glass once scrolled; tuck away while scrolling down, back on the way up
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolidBar(y > 16);
      if (Math.abs(y - last) > 6) setTucked(y > last && y > 320);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close everything when the page changes
  const [seenPath, setSeenPath] = useState(path);
  if (seenPath !== path) {
    setSeenPath(path);
    setOpen(false);
    setMenu(null);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!menu && !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setOpen(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [menu, open]);

  // hover intent: a short pause so the panel doesn't flicker as the pointer passes
  const hover = (m: Menu, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMenu(m), ms);
  };
  const active = (href: string) =>
    href === "/shop"
      ? path.startsWith("/shop")
      : href !== "/" && !href.includes("#") && path.startsWith(href);
  const close = () => setMenu(null);

  return (
    <>
      {/* dims the page behind an open panel (outside the header: its blur would trap a fixed child) */}
      {menu && (
        <div
          aria-hidden
          onClick={close}
          className="fixed inset-0 z-30 hidden animate-fade bg-void/60 backdrop-blur-[2px] lg:block"
        />
      )}
      <header
        ref={headerRef}
        onPointerLeave={() => hover(null, 180)}
        className={`sticky top-0 z-40 transition-[transform,background-color,border-color] duration-500 ${
          tucked && !menu && !open ? "-translate-y-full" : "translate-y-0"
        } ${solidBar || menu ? "border-b hairline bg-void/85 backdrop-blur-xl" : "border-b border-transparent"}`}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-6 px-5 sm:px-8 lg:h-[4.5rem]"
        >
          <Link
            href="/"
            aria-label="TINVO, home"
            className="flex shrink-0 items-center gap-4"
          >
            <Image
              src="/tinvo-wordmark.svg"
              alt="TINVO"
              width={201}
              height={48}
              priority
              className="h-[17px] w-auto sm:h-[19px]"
            />
            <span className="label hidden border-l hairline pl-4 text-dim 2xl:block">
              Make every sip your style
            </span>
          </Link>

          <ul className="hidden items-center gap-1 whitespace-nowrap lg:flex">
            {links.map((l) => {
              const on = active(l.href);
              const expanded = l.menu && menu === l.menu;
              return (
                <li key={l.href} className="relative">
                  {l.menu ? (
                    <button
                      type="button"
                      aria-expanded={!!expanded}
                      aria-controls={`menu-${l.menu}`}
                      onPointerEnter={() => hover(l.menu!, 90)}
                      onClick={() => setMenu(expanded ? null : l.menu!)}
                      className={`label flex items-center gap-1.5 px-3.5 py-3 transition-colors ${expanded || on ? "text-chalk" : "text-ash hover:text-chalk"}`}
                    >
                      {l.label}
                      <svg
                        aria-hidden
                        width="9"
                        height="9"
                        viewBox="0 0 10 10"
                        className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M1 3l4 4 4-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      href={l.href}
                      onPointerEnter={() => hover(null, 90)}
                      aria-current={on ? "page" : undefined}
                      className={`label block px-3.5 py-3 transition-colors ${on ? "text-chalk" : "text-ash hover:text-chalk"}`}
                    >
                      {l.label}
                    </Link>
                  )}
                  <span
                    aria-hidden
                    className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-bronze transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}
                  />
                </li>
              );
            })}
          </ul>

          <div
            className="flex items-center gap-2.5"
            onPointerEnter={() => hover(null, 90)}
          >
            {checkout && (
              <span className="hidden sm:flex">
                <AccountButton />
              </span>
            )}
            {checkout && <CartButton />}
            <Link
              href="/shop"
              className="label ml-1 hidden bg-chalk px-5 py-3 text-void transition-colors hover:bg-bronze lg:block"
            >
              Shop now
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center border hairline lg:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={`absolute left-0 block h-px w-4 bg-chalk transition-transform duration-300 ${open ? "top-1.5 rotate-45" : "top-0.5"}`}
                />
                <span
                  className={`absolute left-0 block h-px w-4 bg-chalk transition-transform duration-300 ${open ? "top-1.5 -rotate-45" : "top-2.5"}`}
                />
              </span>
            </button>
          </div>
        </nav>

        {/* desktop: Shop panel */}
        {menu === "shop" && (
          <div
            id="menu-shop"
            onPointerEnter={() => hover("shop", 0)}
            className="absolute inset-x-0 top-full hidden animate-fade border-b hairline bg-void lg:block"
          >
            <div className="mx-auto grid max-w-[1500px] grid-cols-[1fr_20rem] gap-10 px-8 py-8 xl:grid-cols-[1fr_24rem]">
              <div className="grid gap-6">
                {[
                  [
                    "Liquid foil",
                    foil,
                    "Molten metal and holographic colour, full-wrap",
                  ],
                  [
                    "Solid colour",
                    solid,
                    "One colour edge to edge, and the mark",
                  ],
                ].map(([title, list, note]) => (
                  <section key={title as string}>
                    <div className="flex items-baseline justify-between border-b hairline pb-3">
                      <p className="label text-chalk">{title as string}</p>
                      <p className="text-[12px] text-dim">{note as string}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {(list as Product[]).map((p) => (
                        <Bottle
                          key={p.slug}
                          p={p}
                          onPick={close}
                          onHover={() => setLead(p)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                <div className="flex gap-6 border-t hairline pt-5">
                  <Link
                    href="/shop"
                    onClick={close}
                    className="label text-chalk hover:text-bronze"
                  >
                    All {products.length} designs →
                  </Link>
                  <Link
                    href="/#configurator"
                    onClick={close}
                    className="label text-ash hover:text-chalk"
                  >
                    Not sure? Find yours in 3 questions →
                  </Link>
                </div>
              </div>

              <Link
                href={`/shop/${lead.slug}`}
                onClick={close}
                className="group/f relative block overflow-hidden"
                aria-label={`${lead.name}, ${formatPrice(lead.price)}`}
              >
                <Image
                  key={lead.slug}
                  src={`/products/${lead.images.find((i) => i.kind === "lifestyle")?.file ?? lead.images[0].file}`}
                  alt=""
                  fill
                  sizes="24rem"
                  className="animate-fade object-cover transition-transform duration-700 group-hover/f:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-6">
                  <span className="label block" style={{ color: lead.accent }}>
                    {lead.finish}
                  </span>
                  <span className="display mt-2 block text-3xl text-chalk">
                    {lead.name}
                  </span>
                  <span className="mt-2 block text-[13px] leading-relaxed text-ash">
                    {lead.tagline}
                  </span>
                  <span className="label mt-4 inline-flex items-center gap-2 text-chalk">
                    Shop it · {formatPrice(lead.price)}{" "}
                    <span className="transition-transform group-hover/f:translate-x-1">
                      →
                    </span>
                  </span>
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* desktop: Collections panel */}
        {menu === "collections" && (
          <div
            id="menu-collections"
            onPointerEnter={() => hover("collections", 0)}
            className="absolute inset-x-0 top-full hidden animate-fade border-b hairline bg-void lg:block"
          >
            <div className="mx-auto grid max-w-[1500px] grid-cols-5 gap-px px-8 py-8">
              {collections.map((c) => {
                const inIt = products.filter(c.match);
                return (
                  <Link
                    key={c.slug}
                    href={`/collections/${c.slug}`}
                    onClick={close}
                    className="group/c flex flex-col border-l hairline px-5 py-2 hover:bg-chalk/[0.03]"
                  >
                    <span className="flex -space-x-3">
                      {inIt.slice(0, 4).map((p) => (
                        <Cutout
                          key={p.slug}
                          p={p}
                          className="h-16 w-8 transition-transform duration-500 group-hover/c:-translate-y-1"
                        />
                      ))}
                    </span>
                    <span className="mt-5 flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: c.accent }}
                      />
                      <span className="text-[15px] text-chalk">{c.title}</span>
                    </span>
                    <span className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-dim">
                      {c.lede}
                    </span>
                    <span className="label mt-4 text-ash group-hover/c:text-chalk">
                      {inIt.length} design{inIt.length === 1 ? "" : "s"} →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* phone menu */}
        <div
          id="mobile-nav"
          hidden={!open}
          className="h-[calc(100svh-4rem)] overflow-y-auto border-t hairline bg-void px-5 pb-10 pt-6 lg:hidden"
        >
          <p className="label text-dim">The range</p>
          <div className="rail -mx-5 mt-3 flex gap-1 overflow-x-auto px-4">
            {products.map((p) => (
              <Link
                key={p.slug}
                href={`/shop/${p.slug}`}
                className="flex w-[4.5rem] shrink-0 flex-col items-center py-2"
              >
                <Cutout p={p} className="h-20 w-10" />
                <span className="mt-2 text-center text-[11px] leading-tight text-ash">
                  {p.name}
                </span>
              </Link>
            ))}
          </div>
          <ul className="mt-6">
            {[
              ...links.map(({ href, label }) => ({ href, label })),
              { href: "/contact", label: "Contact" },
            ].map((l, i) => (
              <li key={l.href} className="border-b hairline">
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-5 py-4"
                >
                  <span className="label text-dim">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="display text-3xl text-chalk">{l.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {checkout && (
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="label border hairline py-4 text-center text-chalk"
              >
                My account
              </Link>
              <Link
                href="/order"
                onClick={() => setOpen(false)}
                className="label border hairline py-4 text-center text-chalk"
              >
                Track order
              </Link>
            </div>
          )}
          <Link
            href="/shop"
            onClick={() => setOpen(false)}
            className="label mt-3 block bg-chalk py-4 text-center text-void"
          >
            Shop the range
          </Link>
        </div>
      </header>
    </>
  );
}
