import type { Metadata } from "next";
import { headers } from "next/headers";
import ActionForm, { Field } from "../../../action-form";
import {
  archiveShopAction,
  checkoutSettingsAction,
  createTokenAction,
  qikinkAction,
  razorpayAction,
  revokeTokenAction,
  shopDetailsAction,
} from "../actions";
import { listApiKeys } from "@/core/apikeys";
import { configuredProviders, getCredentials } from "@/core/credentials";
import { requireShop } from "@/core/session";
import { getCheckoutSettings, getShop } from "@/core/settings";
import { STATES } from "@/lib/india";

export const metadata: Metadata = { title: "Settings" };

const rupees = (m: number | null) => (m == null ? "" : String(m / 100));

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t hairline pt-8">
      <h2 className="label text-ash">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function SettingsPage({ params }: PageProps<"/s/[shopId]/settings">) {
  const { shopId } = await params;
  const { role } = await requireShop(shopId, "view");
  const canManage = role !== "staff";
  const isAdmin = role === "owner" || role === "admin";
  const [shop, checkout, providers, keys] = await Promise.all([
    getShop(shopId),
    getCheckoutSettings(shopId),
    configuredProviders(shopId),
    listApiKeys(shopId),
  ]);
  // key ids only (never secrets) to show what is connected
  const [rzp, qk] = isAdmin
    ? await Promise.all([getCredentials(shopId, "razorpay"), getCredentials(shopId, "qikink")])
    : [null, null];
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const has = (p: string) => providers.find((x) => x.provider === p);

  if (!canManage) return <p className="text-[14px] text-dim">Staff can&apos;t change settings.</p>;

  return (
    <div className="grid max-w-3xl gap-12">
      <Section title="Shop details">
        <ActionForm action={shopDetailsAction.bind(null, shopId)} submit="Save details" className="grid gap-5 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" required defaultValue={shop.name} className="field" />
          </Field>
          <Field label="Order number prefix" hint={`Next order: ${shop.orderPrefix}-${shop.nextOrderNumber}`}>
            <input name="orderPrefix" required defaultValue={shop.orderPrefix} className="field uppercase" />
          </Field>
          <Field label="GSTIN" hint="Tax lines are added to orders once this is set">
            <input name="gstin" defaultValue={shop.gstin ?? ""} className="field uppercase" />
          </Field>
          <Field label="Registered state" hint="Decides CGST+SGST vs IGST">
            <select name="originState" defaultValue={shop.originState ?? ""} className="field bg-void">
              <option value="">Not set</option>
              {Object.entries(STATES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Storefront domain">
            <input name="primaryDomain" defaultValue={shop.primaryDomain ?? ""} placeholder="tinvo.in" className="field" />
          </Field>
        </ActionForm>
      </Section>

      <Section title="Checkout">
        <ActionForm action={checkoutSettingsAction.bind(null, shopId)} submit="Save checkout" className="grid gap-5 sm:grid-cols-2">
          <Field label="Shipping charge (₹)" hint="Flat, per order; 0 for free shipping">
            <input name="shipping" inputMode="decimal" defaultValue={rupees(checkout.shippingFlatMinor)} className="field" />
          </Field>
          <Field label="Free shipping over (₹)" hint="Leave empty for never">
            <input name="freeOver" inputMode="decimal" defaultValue={rupees(checkout.freeShippingOverMinor)} className="field" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Storefront deploy hook" hint="Vercel → storefront project → Settings → Git → Deploy Hooks. Used by “Publish to storefront”.">
              <input name="deployHook" type="url" defaultValue={checkout.storefrontDeployHook ?? ""} className="field" />
            </Field>
          </div>
        </ActionForm>
      </Section>

      {isAdmin && (
        <Section id="integrations" title="Integrations">
          <div className="grid gap-10">
            <div>
              <p className="text-[15px]">
                Razorpay{" "}
                <span className="label ml-2 text-dim">
                  {rzp ? `${rzp.keyId.startsWith("rzp_live_") ? "live" : "test mode"} · ${rzp.keyId}` : "not connected"}
                </span>
              </p>
              <p className="mt-2 text-[13px] text-dim">
                Webhook URL (events payment.captured, order.paid):{" "}
                <code className="break-all text-ash">{`${origin}/api/webhooks/razorpay/${shopId}`}</code>
              </p>
              <ActionForm action={razorpayAction.bind(null, shopId)} submit="Save Razorpay" className="mt-5 grid gap-5 sm:grid-cols-3">
                <Field label="Key ID">
                  <input name="keyId" required defaultValue={rzp?.keyId ?? ""} placeholder="rzp_test_…" className="field" />
                </Field>
                <Field label="Key secret" hint={rzp ? "Leave empty to keep" : undefined}>
                  <input name="keySecret" type="password" autoComplete="off" className="field" />
                </Field>
                <Field label="Webhook secret" hint={rzp?.webhookSecret ? "Leave empty to keep" : undefined}>
                  <input name="webhookSecret" type="password" autoComplete="off" className="field" />
                </Field>
              </ActionForm>
            </div>

            <div>
              <p className="text-[15px]">
                Qikink <span className="label ml-2 text-dim">{qk ? `${qk.env} · client ${qk.clientId}` : "not connected"}</span>
              </p>
              <ActionForm action={qikinkAction.bind(null, shopId)} submit="Test and save Qikink" className="mt-5 grid gap-5 sm:grid-cols-3">
                <Field label="Client ID">
                  <input name="clientId" required defaultValue={qk?.clientId ?? ""} className="field" />
                </Field>
                <Field label="Client secret" hint={qk ? "Leave empty to keep" : undefined}>
                  <input name="clientSecret" type="password" autoComplete="off" className="field" />
                </Field>
                <Field label="Environment">
                  <select name="env" defaultValue={qk?.env ?? "sandbox"} className="field bg-void">
                    <option value="sandbox">Sandbox</option>
                    <option value="live">Live</option>
                  </select>
                </Field>
              </ActionForm>
            </div>
            {has("razorpay") && has("qikink") && <p className="text-[13px] text-dim">Both connected. Secrets are encrypted and never shown again.</p>}
          </div>
        </Section>
      )}

      {isAdmin && (
        <Section id="storefront" title="Storefront tokens">
          <p className="text-[14px] text-ash">
            A storefront uses a token to read products and place orders for this shop only. Put it in the storefront’s
            environment as <code>STOREFRONT_TOKEN</code>, with <code>ADMIN_API_URL={origin}</code>.
          </p>
          {keys.length > 0 && (
            <ul className="mt-5 border-t hairline">
              {keys.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-4 border-b hairline py-3 text-[14px]">
                  <span className="flex-1">{k.name}</span>
                  <code className="text-dim">{k.prefix}…</code>
                  <span className="text-[12px] text-dim">
                    {k.lastUsedAt ? `used ${k.lastUsedAt.toLocaleDateString("en-IN")}` : "never used"}
                  </span>
                  <ActionForm
                    action={revokeTokenAction.bind(null, shopId, k.id)}
                    submit="Revoke"
                    tone="quiet"
                    confirm="Revoke this token? The storefront using it stops working."
                    className="flex items-center gap-2"
                  />
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={createTokenAction.bind(null, shopId)} submit="Create token" className="mt-5 grid gap-4 sm:max-w-sm">
            <Field label="Name">
              <input name="name" placeholder="TINVO website" className="field" />
            </Field>
          </ActionForm>
        </Section>
      )}

      {role === "owner" && (
        <Section title="Archive shop">
          <p className="text-[14px] text-ash">
            Hides the shop and stops new orders. Orders, payments and history are kept; nothing is deleted.
          </p>
          <div className="mt-5">
            <ActionForm
              action={archiveShopAction.bind(null, shopId)}
              submit="Archive this shop"
              tone="danger"
              confirm={`Archive ${shop.name}? It disappears from the admin and its storefront stops taking orders.`}
            />
          </div>
        </Section>
      )}
    </div>
  );
}
