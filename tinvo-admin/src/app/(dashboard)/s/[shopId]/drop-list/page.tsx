import type { Metadata } from "next";
import ActionForm from "../../../action-form";
import { removeSubscriberAction } from "../actions";
import { listSubscribers } from "@/core/subscribers";

export const metadata: Metadata = { title: "Drop list" };

export default async function DropListPage({ params }: PageProps<"/s/[shopId]/drop-list">) {
  const { shopId } = await params;
  const list = await listSubscribers(shopId);

  return (
    <>
      <p className="max-w-2xl text-[14px] text-ash">
        People who signed up on the website to hear about new designs first. To email them, copy the addresses below into
        the <strong>Bcc</strong> field (never To or Cc, so nobody sees anyone else&apos;s address).
      </p>

      {list.length === 0 ? (
        <p className="mt-8 border hairline p-8 text-center text-[14px] text-dim">No sign-ups yet.</p>
      ) : (
        <>
          <label className="mt-6 grid gap-2">
            <span className="label text-dim">{list.length} addresses, ready to paste into Bcc</span>
            <textarea readOnly rows={4} className="field font-mono text-[13px]" value={list.map((s) => s.email).join(", ")} />
          </label>
          <ul className="mt-6 divide-y divide-chalk/10 border-y hairline">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-[14px] text-chalk">{s.email}</span>
                <span className="flex items-center gap-4">
                  <span className="label text-dim">
                    {s.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <ActionForm
                    action={removeSubscriberAction.bind(null, shopId, s.id)}
                    submit="Remove"
                    tone="quiet"
                    confirm={`Remove ${s.email} from the list?`}
                    className="flex items-center gap-3"
                  />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
