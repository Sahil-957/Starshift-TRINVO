import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "../../../action-form";
import { publishStorefrontAction } from "../actions";
import { listProducts } from "@/core/catalogue";
import { getShop } from "@/core/settings";
import { formatMinor } from "@/lib/india";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ params }: PageProps<"/s/[shopId]/products">) {
  const { shopId } = await params;
  const [shop, list] = await Promise.all([getShop(shopId), listProducts(shopId)]);
  const money = (m: number) => formatMinor(m, shop.settlementCurrency);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[14px] text-ash">
          {list.length} products · {list.filter((p) => p.status === "active").length} active
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ActionForm action={publishStorefrontAction.bind(null, shopId)} submit="Publish to storefront" tone="quiet" className="flex items-center gap-3" />
          <Link href={`/s/${shopId}/products/new`} className="button">
            New product
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-8 border hairline p-8 text-center text-[14px] text-dim">
          No products yet. Add one, or import the TINVO catalogue with <code>npm run catalogue:import -- tinvo</code>.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="label text-dim">
              <tr className="border-b hairline">
                <th className="py-3 font-normal">Product</th>
                <th className="font-normal">Status</th>
                <th className="text-right font-normal">Price</th>
                <th className="text-right font-normal">Cost</th>
                <th className="text-right font-normal">Margin</th>
                <th className="font-normal pl-6">Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b hairline hover:bg-panel">
                  <td className="py-3">
                    <Link href={`/s/${shopId}/products/${p.id}`} className="underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <span className="ml-2 text-dim">/{p.slug}</span>
                  </td>
                  <td className={`label ${p.status === "active" ? "text-chalk" : "text-dim"}`}>{p.status}</td>
                  <td className="text-right tabular-nums">{money(p.priceMinor)}</td>
                  <td className="text-right tabular-nums text-ash">{p.costMinor == null ? "—" : money(p.costMinor)}</td>
                  <td className="text-right tabular-nums text-ash">
                    {p.costMinor == null ? "—" : `${Math.round(((p.priceMinor - p.costMinor) / p.priceMinor) * 100)}%`}
                  </td>
                  <td className="pl-6 text-ash">
                    {!p.supplierSku ? <span className="text-rose">No Qikink SKU</span> : p.printFileKey ? "Print file" : "My Products"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
