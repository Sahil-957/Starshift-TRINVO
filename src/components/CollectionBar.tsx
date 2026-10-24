import Link from "next/link";
import { collectionGroups } from "@/data/collections";

/**
 * Category navigation for the catalogue. Rendered on the shop page and on
 * every collection page, with the current collection marked.
 */
export default function CollectionBar({ active }: { active?: string }) {
  return (
    <nav aria-label="Collections" className="border-t hairline">
      {collectionGroups.map(({ group, items }) => (
        <div
          key={group}
          className="flex flex-wrap items-baseline gap-x-6 gap-y-3 border-b hairline py-4"
        >
          <span className="label w-24 shrink-0 text-dim">{group}</span>
          <ul className="flex flex-wrap items-baseline gap-x-5 gap-y-3">
            {items.map((item) => {
              const current = item.slug === active;
              return (
                <li key={item.slug}>
                  <Link
                    href={`/collections/${item.slug}`}
                    aria-current={current ? "page" : undefined}
                    className="label transition-colors"
                    style={{ color: current ? item.accent : undefined }}
                  >
                    <span className={current ? "" : "text-ash hover:text-chalk"}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
