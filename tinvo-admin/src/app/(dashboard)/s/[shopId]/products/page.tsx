import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "../../../action-form";
import { publishStorefrontAction, quickEditAction } from "../actions";
import { listProducts } from "@/core/catalogue";
import { requireShop } from "@/core/session";
import { getShop } from "@/core/settings";
import { formatMinor } from "@/lib/india";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ params }: PageProps<"/s/[shopId]/products">) {
  const { shopId } = await params;
  const { role } = await requireShop(shopId, "view");
  const [shop, list] = await Promise.all([getShop(shopId), listProducts(shopId)]);
  const money = (m: number) => formatMinor(m, shop.settlementCurrency);
  const canEdit = role !== "staff";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[14px] text-ash">
          {list.length} products · {list.filter((p) => p.status === "active").length} on sale
        </p>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            <ActionForm action={publishStorefrontAction.bind(null, shopId)} submit="Publish to website" tone="quiet" className="flex items-center gap-3" />
            <Link href={`/s/${shopId}/products/new`} className="button">
              New product
            </Link>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <p className="mt-8 border hairline p-8 text-center text-[14px] text-dim">No products yet. Add one with New product.</p>
      ) : (
        <ActionForm action={quickEditAction.bind(null, shopId)} submit="Save prices and status" className="mt-6 grid gap-5">
          <p className="text-[13px] text-dim">
            Change prices (₹, GST included) or hide a design by setting it to Draft, then save once. Click a name for
            everything else.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead className="label text-dim">
                <tr className="border-b hairline">
                  <th className="py-3 font-normal">Product</th>
                  <th className="w-36 font-normal">Price (₹)</th>
                  <th className="w-36 font-normal">On the website</th>
                  <th className="text-right font-normal">Your cost</th>
                  <th className="text-right font-normal">You keep</th>
                  <th className="pl-6 font-normal">Qikink</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b hairline">
                    <td className="py-2">
                      <input type="hidden" name="id" value={p.id} />
                      <Link href={`/s/${shopId}/products/${p.id}`} className="underline-offset-4 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td>
                      <input
                        name={`price:${p.id}`}
                        defaultValue={p.priceMinor / 100}
                        inputMode="decimal"
                        disabled={!canEdit}
                        aria-label={`${p.name} price`}
                        className="field w-28 py-2"
                      />
                    </td>
                    <td>
                      <select
                        name={`status:${p.id}`}
                        defaultValue={p.status}
                        disabled={!canEdit}
                        aria-label={`${p.name} status`}
                        className="field w-32 bg-void py-2"
                      >
                        <option value="active">On sale</option>
                        <option value="draft">Hidden (draft)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="text-right tabular-nums text-ash">{p.costMinor == null ? "—" : money(p.costMinor)}</td>
                    <td className="text-right tabular-nums text-ash">
                      {p.costMinor == null ? "—" : money(p.priceMinor - p.costMinor)}
                    </td>
                    <td className="pl-6 text-ash">
                      {!p.supplierSku ? (
                        <span className="text-rose">No SKU</span>
                      ) : p.printFileKey ? (
                        "Print file"
                      ) : (
                        <span title={p.supplierSku}>My Products ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!canEdit && <p className="text-[13px] text-dim">Staff can view products but not change them.</p>}
        </ActionForm>
      )}
    </>
  );
}
