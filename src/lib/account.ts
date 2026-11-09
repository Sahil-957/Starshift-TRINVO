import { cookies } from "next/headers";
import { adminFetch, checkoutEnabled } from "./admin-api";

/**
 * Customer accounts live in the admin; the storefront only keeps the session
 * token, in an httpOnly cookie that page scripts can't read.
 */
export const SESSION_COOKIE = "tinvo_session";

export type AccountOrder = {
  number: string;
  status: string;
  placedAt: string;
  totalMinor: number;
  courier: string | null;
  awb: string | null;
  trackingUrl: string | null;
  items: { title: string; slug: string; quantity: number }[];
};
export type Account = {
  customer: { name: string; email: string; verified: boolean; hasPassword: boolean };
  orders: AccountOrder[];
  lastAddress: { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pin: string } | null;
};

/** Calls the admin's account API with this visitor's session. */
export async function accountCall(action: string, body: Record<string, unknown> = {}) {
  const session = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const res = await adminFetch("/account", { method: "POST", body: JSON.stringify({ ...body, action, session }) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** The signed-in customer with their orders, or null (signed out, or the admin unreachable). */
export async function currentAccount(): Promise<Account | null> {
  if (!checkoutEnabled || !(await cookies()).has(SESSION_COOKIE)) return null;
  try {
    const { ok, data } = await accountCall("me");
    return ok && data.customer ? data : null;
  } catch {
    return null;
  }
}

export async function setSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86_400,
  });
}

export const clearSession = async () => (await cookies()).delete(SESSION_COOKIE);

/** Only same-site paths, so ?next= can't send someone to another website. */
export const safeNext = (v: unknown) => (typeof v === "string" && /^\/(?![/\\])/.test(v) ? v : "/account");
