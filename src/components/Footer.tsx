import Image from "next/image";
import Link from "next/link";

const columns = [
  {
    title: "Designs",
    links: [
      { href: "/shop", label: "All designs" },
      { href: "/#range", label: "This season" },
      { href: "/#configurator", label: "Find your design" },
      { href: "/#spec", label: "Specification" },
    ],
  },
  {
    title: "Studio",
    links: [
      { href: "/about", label: "What we make" },
      { href: "/#manifesto", label: "Why we draw them" },
      { href: "/#reviews", label: "Reviews" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Shipping" },
      { href: "/contact", label: "Returns" },
      { href: "/contact", label: "Bulk & corporate" },
      { href: "/contact", label: "Care" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t hairline bg-void">
      <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Image
              src="/trinvo-lockup.svg"
              alt="TRINVO"
              width={254}
              height={314}
              className="h-auto w-[104px] max-w-full sm:w-[120px]"
            />
            <p className="label mt-7 text-chalk">Art you can carry</p>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ash">
              Original designs, printed full-wrap on one stainless barrel.
              Made in India.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="label text-dim">{col.title}</h3>
                <ul className="mt-6 space-y-3.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="wipe text-[15px] text-ash hover:text-chalk"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t hairline pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="label text-dim">© {new Date().getFullYear()} TRINVO</p>
          <p className="label text-dim">Printed to order · India</p>
        </div>
      </div>
    </footer>
  );
}
