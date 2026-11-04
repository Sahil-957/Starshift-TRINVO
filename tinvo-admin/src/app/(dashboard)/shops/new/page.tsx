import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { orgsManagedBy } from "@/core/access";
import { requireUser } from "@/core/session";
import NewShopForm from "./form";

export const metadata: Metadata = { title: "New shop" };

export default async function NewShopPage() {
  const user = await requireUser();
  // ponytail: first organisation only; add a picker when someone belongs to two
  const [org] = await orgsManagedBy(user.id);
  if (!org) notFound();

  return (
    <>
      <p className="label text-dim">Organisation</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">New shop</h1>
      <p className="mt-3 max-w-lg text-[15px] text-ash">
        Every brand is a shop. Its catalogue, orders, settings and credentials stay separate from the others.
      </p>
      <NewShopForm orgId={org.orgId} />
    </>
  );
}
