"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AccessDenied } from "@/core/access";
import { requireUser } from "@/core/session";
import { createShop, shopInput } from "@/core/shops";

export async function createShopAction(_: string | null, form: FormData): Promise<string | null> {
  const user = await requireUser();
  const parsed = shopInput.safeParse({
    name: form.get("name"),
    slug: form.get("slug"),
    settlementCurrency: form.get("settlementCurrency"),
  });
  if (!parsed.success) return parsed.error.issues[0].message;

  let shopId: string;
  try {
    // createShop re-checks that the user owns/administers this organisation
    shopId = (await createShop(user.id, String(form.get("orgId")), parsed.data)).id;
  } catch (e) {
    if (e instanceof AccessDenied) return "You can't create shops in this organisation.";
    if ((e as { cause?: { code?: string } }).cause?.code === "23505") return "That slug is already used.";
    throw e;
  }
  // the switcher in the shared layout must pick up the new shop
  revalidatePath("/", "layout");
  redirect(`/s/${shopId}`);
}
