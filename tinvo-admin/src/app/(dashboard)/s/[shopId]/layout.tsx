import ActionForm from "../../action-form";
import { publishStorefrontAction } from "./actions";
import ShopTabs from "./tabs";
import { lastProductEdit } from "@/core/catalogue";
import { requireShop } from "@/core/session";
import { getShop, getShopState } from "@/core/settings";

export default async function ShopLayout({ children, params }: LayoutProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const { role } = await requireShop(shopId, "view");
  const [shop, state, lastEdit] = await Promise.all([getShop(shopId), getShopState(shopId), lastProductEdit(shopId)]);
  // product edits newer than the last publish are not on the website yet
  const behind = lastEdit !== null && (!state.lastPublishedAt || new Date(lastEdit) > new Date(state.lastPublishedAt));

  return (
    <>
      <p className="label text-dim">
        Shop · your role: <span className="text-ash">{role}</span>
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{shop.name}</h1>
      {behind && role !== "staff" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-bronze/50 bg-bronze/5 px-5 py-4">
          <p className="text-[14px]">
            <span className="text-bronze">Unpublished changes.</span>{" "}
            <span className="text-ash">Product edits aren&apos;t on the website until you publish.</span>
          </p>
          <ActionForm
            action={publishStorefrontAction.bind(null, shopId)}
            submit="Publish now"
            className="flex flex-wrap items-center gap-3"
          />
        </div>
      )}
      <ShopTabs shopId={shopId} />
      <div className="mt-8">{children}</div>
    </>
  );
}
