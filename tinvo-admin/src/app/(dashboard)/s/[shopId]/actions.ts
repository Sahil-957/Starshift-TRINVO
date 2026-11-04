"use server";

/**
 * Every shop action: the shop id is bound server-side by the page, and each
 * action re-checks access before doing anything. "manage" excludes staff;
 * money and secrets additionally need an organisation owner or admin.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import type { FormState } from "../../action-form";
import { createApiKey, revokeApiKey } from "@/core/apikeys";
import { createProduct, getProduct, updateProduct } from "@/core/catalogue";
import { getCredentials, setCredentials } from "@/core/credentials";
import { cancelOrder, CheckoutError, fulfil, refundOrder, syncShop } from "@/core/orders";
import { requireShop } from "@/core/session";
import {
  archiveShop,
  checkoutSettingsInput,
  getCheckoutSettings,
  setCheckoutSettings,
  updateShopDetails,
} from "@/core/settings";
import { addMember, removeMember } from "@/core/team";

const f = (form: FormData, k: string) => String(form.get(k) ?? "");
const rupees = (v: string) => (v.trim() === "" ? null : Math.round(Number(v.replace(/[,₹\s]/g, "")) * 100));

/** Runs `fn`, turning validation and known errors into a message for the form. */
async function attempt(fn: () => Promise<string | void>): Promise<FormState> {
  try {
    return { ok: (await fn()) || "Saved." };
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues[0].message };
    if (e instanceof CheckoutError) return { error: e.message };
    const cause = (e as { cause?: { code?: string } }).cause;
    if (cause?.code === "23505") return { error: "That is already in use." };
    if (e instanceof Error && /^(Razorpay|Qikink)/.test(e.message)) return { error: e.message };
    throw e;
  }
}

async function requireAdmin(shopId: string) {
  const ctx = await requireShop(shopId, "manage");
  if (ctx.role !== "owner" && ctx.role !== "admin") throw new Error("Only organisation owners and admins can do this.");
  return ctx;
}

// ─── products ───────────────────────────────────────────────────────────────

const productFields = (form: FormData) => ({
  name: f(form, "name"),
  slug: f(form, "slug"),
  tagline: f(form, "tagline"),
  description: f(form, "description"),
  status: f(form, "status") as "draft" | "active" | "archived",
  price: f(form, "price"),
  compareAt: f(form, "compareAt"),
  cost: f(form, "cost"),
  taxRatePercent: f(form, "taxRatePercent"),
  hsnCode: f(form, "hsnCode"),
  supplierSku: f(form, "supplierSku"),
  printTypeId: f(form, "printTypeId"),
  designCode: f(form, "designCode"),
  printFileKey: f(form, "printFileKey"),
  printWidthIn: f(form, "printWidthIn"),
  printHeightIn: f(form, "printHeightIn"),
  mockupUrl: f(form, "mockupUrl"),
});

export async function createProductAction(shopId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireShop(shopId, "manage");
  let id = "";
  const r = await attempt(async () => {
    id = (await createProduct(shopId, productFields(form))).id;
  });
  if (r?.error) return r;
  revalidatePath(`/s/${shopId}/products`);
  redirect(`/s/${shopId}/products/${id}`);
}

export async function updateProductAction(shopId: string, productId: string, _: FormState, form: FormData) {
  await requireShop(shopId, "manage");
  if (!(await getProduct(shopId, productId))) return { error: "Product not found." };
  const r = await attempt(async () => {
    await updateProduct(shopId, productId, productFields(form));
  });
  revalidatePath(`/s/${shopId}/products`);
  return r;
}

/** Rebuilds the storefront so catalogue edits go live (Vercel deploy hook). */
export async function publishStorefrontAction(shopId: string): Promise<FormState> {
  await requireShop(shopId, "manage");
  const { storefrontDeployHook } = await getCheckoutSettings(shopId);
  if (!storefrontDeployHook) return { error: "Add the storefront deploy hook in Settings first." };
  const res = await fetch(storefrontDeployHook, { method: "POST" });
  return res.ok ? { ok: "Storefront rebuild started. Changes are live in a few minutes." } : { error: `Deploy hook failed (${res.status}).` };
}

// ─── orders ─────────────────────────────────────────────────────────────────

export async function retryFulfilmentAction(shopId: string, orderId: string): Promise<FormState> {
  await requireShop(shopId, "manage");
  await fulfil(shopId, orderId);
  revalidatePath(`/s/${shopId}/orders/${orderId}`);
  return { ok: "Tried again; see the timeline below." };
}

export async function syncAction(shopId: string): Promise<FormState> {
  await requireShop(shopId, "manage");
  const r = await syncShop(shopId);
  revalidatePath(`/s/${shopId}/orders`);
  return r.error ? { error: `Checked ${r.checked}, updated ${r.updated}. Qikink: ${r.error}` } : { ok: `Checked ${r.checked} open orders, updated ${r.updated}.` };
}

export async function refundAction(shopId: string, orderId: string, _: FormState, form: FormData) {
  const { user } = await requireAdmin(shopId);
  const r = await attempt(async () => {
    await refundOrder(user.id, shopId, orderId, f(form, "reason"));
    return "Refunded in full. Cancel the order in the Qikink dashboard if it has not shipped.";
  });
  revalidatePath(`/s/${shopId}/orders/${orderId}`);
  return r;
}

export async function cancelAction(shopId: string, orderId: string): Promise<FormState> {
  const { user } = await requireShop(shopId, "manage");
  const r = await attempt(async () => {
    await cancelOrder(user.id, shopId, orderId);
    return "Cancelled.";
  });
  revalidatePath(`/s/${shopId}/orders/${orderId}`);
  return r;
}

// ─── team ───────────────────────────────────────────────────────────────────

export async function addMemberAction(shopId: string, _: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireAdmin(shopId);
  const r = await attempt(async () => {
    const { created } = await addMember(user.id, shopId, {
      email: f(form, "email"),
      name: f(form, "name"),
      role: f(form, "role") as "manager" | "staff",
      password: f(form, "password"),
    });
    return created ? "Account created and added. Share the password with them privately." : "Added to this shop.";
  });
  revalidatePath(`/s/${shopId}/team`);
  return r;
}

export async function removeMemberAction(shopId: string, userId: string): Promise<FormState> {
  const { user } = await requireAdmin(shopId);
  await removeMember(user.id, shopId, userId);
  revalidatePath(`/s/${shopId}/team`);
  return { ok: "Removed." };
}

// ─── settings ───────────────────────────────────────────────────────────────

export async function shopDetailsAction(shopId: string, _: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireShop(shopId, "manage");
  const r = await attempt(() =>
    updateShopDetails(user.id, shopId, {
      name: f(form, "name"),
      gstin: f(form, "gstin"),
      originState: f(form, "originState"),
      orderPrefix: f(form, "orderPrefix"),
      primaryDomain: f(form, "primaryDomain"),
    }),
  );
  revalidatePath(`/s/${shopId}`, "layout");
  return r;
}

export async function checkoutSettingsAction(shopId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireShop(shopId, "manage");
  return attempt(() =>
    setCheckoutSettings(
      shopId,
      checkoutSettingsInput.parse({
        shippingFlatMinor: rupees(f(form, "shipping")) ?? 0,
        freeShippingOverMinor: rupees(f(form, "freeOver")),
        storefrontDeployHook: f(form, "deployHook").trim() || null,
      }),
    ),
  );
}

/** Blank secret fields keep what is stored, so secrets are never shown back. */
export async function razorpayAction(shopId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin(shopId);
  const current = await getCredentials(shopId, "razorpay");
  const keyId = f(form, "keyId").trim();
  const keySecret = f(form, "keySecret").trim() || current?.keySecret || "";
  const webhookSecret = f(form, "webhookSecret").trim() || current?.webhookSecret || "";
  if (!/^rzp_(test|live)_\w+$/.test(keyId)) return { error: "Key ID starts with rzp_test_ or rzp_live_." };
  if (!keySecret) return { error: "Enter the key secret." };
  await setCredentials(shopId, "razorpay", { keyId, keySecret, webhookSecret });
  revalidatePath(`/s/${shopId}`, "layout");
  return { ok: `Saved (${keyId.startsWith("rzp_live_") ? "LIVE" : "test mode"}).` };
}

export async function qikinkAction(shopId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin(shopId);
  const current = await getCredentials(shopId, "qikink");
  const clientId = f(form, "clientId").trim();
  const clientSecret = f(form, "clientSecret").trim() || current?.clientSecret || "";
  const env = f(form, "env") === "live" ? "live" : "sandbox";
  if (!/^\d+$/.test(clientId)) return { error: "Client ID is the number shown in Qikink → Integration → Custom API." };
  if (!clientSecret) return { error: "Enter the client secret." };
  // prove the keys work before saving them
  const { getToken } = await import("@/lib/qikink");
  try {
    await getToken({ clientId, clientSecret, env }, true);
  } catch {
    return { error: `Qikink ${env} rejected these keys.` };
  }
  await setCredentials(shopId, "qikink", { clientId, clientSecret, env });
  revalidatePath(`/s/${shopId}`, "layout");
  return { ok: `Connected to Qikink ${env}.` };
}

export async function createTokenAction(shopId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin(shopId);
  const token = await createApiKey(shopId, f(form, "name"));
  revalidatePath(`/s/${shopId}/settings`);
  return { ok: `Copy it now, it won't be shown again: ${token}` };
}

export async function revokeTokenAction(shopId: string, keyId: string): Promise<FormState> {
  await requireAdmin(shopId);
  await revokeApiKey(shopId, keyId);
  revalidatePath(`/s/${shopId}/settings`);
  return { ok: "Revoked." };
}

export async function archiveShopAction(shopId: string): Promise<FormState> {
  const { user, role } = await requireShop(shopId, "manage");
  if (role !== "owner") return { error: "Only the organisation owner can archive a shop." };
  await archiveShop(user.id, shopId);
  revalidatePath("/", "layout");
  redirect("/");
}
