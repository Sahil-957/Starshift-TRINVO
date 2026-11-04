import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "../../../../action-form";
import { updateProductAction } from "../../actions";
import ProductFields from "../fields";
import { getProduct } from "@/core/catalogue";
import { requireShop } from "@/core/session";

export const metadata: Metadata = { title: "Product" };

export default async function ProductPage({ params }: PageProps<"/s/[shopId]/products/[productId]">) {
  const { shopId, productId } = await params;
  const { role } = await requireShop(shopId, "view");
  const p = await getProduct(shopId, productId);
  if (!p) notFound();

  return (
    <>
      <Link href={`/s/${shopId}/products`} className="label text-dim hover:text-chalk">
        ← Products
      </Link>
      <h2 className="mt-4 text-xl">{p.name}</h2>
      {role === "staff" ? (
        <p className="mt-4 text-[14px] text-dim">Staff can view products but not edit them.</p>
      ) : (
        <ActionForm action={updateProductAction.bind(null, shopId, p.id)} submit="Save" className="mt-8 grid max-w-3xl gap-8">
          <ProductFields p={p} />
        </ActionForm>
      )}
    </>
  );
}
