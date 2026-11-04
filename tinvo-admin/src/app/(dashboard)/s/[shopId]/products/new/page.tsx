import type { Metadata } from "next";
import ActionForm from "../../../../action-form";
import { createProductAction } from "../../actions";
import ProductFields from "../fields";
import { requireShop } from "@/core/session";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage({ params }: PageProps<"/s/[shopId]/products/new">) {
  const { shopId } = await params;
  await requireShop(shopId, "manage");
  return (
    <>
      <h2 className="text-xl">New product</h2>
      <ActionForm action={createProductAction.bind(null, shopId)} submit="Create product" className="mt-8 grid max-w-3xl gap-8">
        <ProductFields />
      </ActionForm>
    </>
  );
}
