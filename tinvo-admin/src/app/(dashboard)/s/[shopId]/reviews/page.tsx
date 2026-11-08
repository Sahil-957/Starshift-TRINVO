import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "../../../action-form";
import { reviewStatusAction } from "../actions";
import { listReviews } from "@/core/reviews";

export const metadata: Metadata = { title: "Reviews" };

const filters = [
  ["pending", "Waiting"],
  ["published", "Published"],
  ["hidden", "Hidden"],
  ["", "All"],
] as const;

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function ReviewsPage({ params, searchParams }: PageProps<"/s/[shopId]/reviews">) {
  const { shopId } = await params;
  const sp = await searchParams;
  const status = filters.find(([s]) => s === String(sp.status ?? "pending"))?.[0] ?? "pending";
  const list = await listReviews(shopId, status || undefined);

  return (
    <>
      <p className="max-w-2xl text-[14px] text-ash">
        Only customers with a paid order for the design can write a review. Nothing shows on the website until you publish it;
        you can hide it again at any time.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2">
        {filters.map(([s, label]) => (
          <Link
            key={s}
            href={`?status=${s}`}
            className={`label border px-3 py-2 ${s === status ? "border-chalk text-chalk" : "hairline text-dim hover:text-ash"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="mt-8 border hairline p-8 text-center text-[14px] text-dim">
          {status === "pending" ? "No reviews waiting. New ones are emailed to you as they arrive." : "No reviews here yet."}
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {list.map((r) => (
            <li key={r.id} className="border hairline p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-[15px] tracking-[0.1em] text-bronze" aria-label={`${r.rating} out of 5`}>
                  {stars(r.rating)}
                </p>
                <p className="label text-dim">
                  {r.product} · <Link href={`/s/${shopId}/orders/${r.orderId}`} className="underline">{r.orderNumber}</Link> ·{" "}
                  {r.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              {r.title && <p className="mt-3 text-[15px] text-chalk">{r.title}</p>}
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ash">{r.body}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="label text-dim">
                  {r.author} · {r.status === "pending" ? "waiting" : r.status}
                </p>
                <div className="flex gap-2">
                  {r.status !== "published" && (
                    <ActionForm action={reviewStatusAction.bind(null, shopId, r.id, "published")} submit="Publish" className="flex items-center gap-3" />
                  )}
                  {r.status !== "hidden" && (
                    <ActionForm action={reviewStatusAction.bind(null, shopId, r.id, "hidden")} submit="Hide" tone="quiet" className="flex items-center gap-3" />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
