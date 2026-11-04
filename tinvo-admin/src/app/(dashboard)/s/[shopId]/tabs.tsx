"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["", "Overview"],
  ["/orders", "Orders"],
  ["/products", "Products"],
  ["/reports", "Reports"],
  ["/team", "Team"],
  ["/settings", "Settings"],
] as const;

export default function ShopTabs({ shopId }: { shopId: string }) {
  const path = usePathname();
  const base = `/s/${shopId}`;
  return (
    <nav className="-mx-1 mt-6 flex gap-1 overflow-x-auto border-b hairline">
      {tabs.map(([href, label]) => {
        const to = base + href;
        const active = href === "" ? path === base : path.startsWith(to);
        return (
          <Link
            key={href}
            href={to}
            className={`label whitespace-nowrap border-b-2 px-3 py-3 ${
              active ? "border-chalk text-chalk" : "border-transparent text-dim hover:text-ash"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
