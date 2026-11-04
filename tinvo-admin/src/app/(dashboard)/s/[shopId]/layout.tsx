import { getShop } from "@/core/settings";
import { requireShop } from "@/core/session";
import ShopTabs from "./tabs";

export default async function ShopLayout({ children, params }: LayoutProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const { role } = await requireShop(shopId, "view");
  const shop = await getShop(shopId);
  return (
    <>
      <p className="label text-dim">
        Shop · your role: <span className="text-ash">{role}</span>
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{shop.name}</h1>
      <ShopTabs shopId={shopId} />
      <div className="mt-8">{children}</div>
    </>
  );
}
