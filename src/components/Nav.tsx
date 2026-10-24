"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "/shop", label: "Range" },
  { href: "/#configurator", label: "Configurator" },
  { href: "/#spec", label: "Spec" },
  { href: "/about", label: "Studio" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-500 ${
        solid ? "hairline bg-void/80 backdrop-blur-xl" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="TRINVO — art you can carry, home"
          className="flex shrink-0 items-center gap-4"
        >
          <Image
            src="/trinvo-wordmark.svg"
            alt="TRINVO"
            width={201}
            height={48}
            priority
            className="h-[17px] w-auto sm:h-[19px]"
          />
          <span className="label hidden border-l hairline pl-4 text-dim xl:block">
            Art you can carry
          </span>
        </Link>

        <ul className="hidden items-center gap-10 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="wipe label text-ash hover:text-chalk">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/shop"
            className="label hidden bg-chalk px-5 py-3 text-void transition-colors hover:bg-bronze hover:text-void sm:block"
          >
            Shop
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
                className={`absolute left-0 block h-px w-4 bg-chalk transition-transform duration-300 ${
                  open ? "top-1.5 rotate-45" : "top-0.5"
                }`}
              />
              <span
                className={`absolute left-0 block h-px w-4 bg-chalk transition-transform duration-300 ${
                  open ? "top-1.5 -rotate-45" : "top-2.5"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t hairline bg-void px-5 pb-10 pt-4 lg:hidden"
      >
        <ul>
          {[...links, { href: "/contact", label: "Contact" }].map((link, i) => (
            <li key={link.href} className="border-b hairline">
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-5 py-5"
              >
                <span className="label text-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="display text-3xl text-chalk">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/shop"
          onClick={() => setOpen(false)}
          className="label mt-8 block bg-chalk py-4 text-center text-void"
        >
          Shop the range
        </Link>
      </div>
    </header>
  );
}
