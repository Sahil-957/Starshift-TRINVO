"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Shop context lives in the URL (/s/<id>) and is re-checked server-side on every request. */
export default function ShopSwitcher({ shops }: { shops: { id: string; name: string }[] }) {
  const path = usePathname();
  const current = shops.find((s) => path.startsWith(`/s/${s.id}`));

  return (
    <details className="relative">
      <summary className="label flex cursor-pointer list-none items-center gap-2 border hairline px-3 py-2 text-ash hover:text-chalk">
        {current?.name ?? "All shops"} <span aria-hidden="true">▾</span>
      </summary>
      <ul className="absolute left-0 z-10 mt-1 min-w-56 border hairline bg-panel py-1">
        <li>
          <Link href="/" className="block px-4 py-2 text-[14px] text-ash hover:bg-raise hover:text-chalk">
            All shops
          </Link>
        </li>
        {shops.map((s) => (
          <li key={s.id}>
            <Link
              href={`/s/${s.id}`}
              aria-current={s.id === current?.id ? "page" : undefined}
              className="block px-4 py-2 text-[14px] text-ash hover:bg-raise hover:text-chalk aria-[current=page]:text-chalk"
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
