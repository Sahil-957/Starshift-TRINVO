/**
 * The storefront's only line to the admin (server side only). The token decides
 * which shop this is; it never reaches the browser. All prices, payment checks
 * and order logic live in the admin, so these calls just forward.
 */
const url = process.env.ADMIN_API_URL;
const token = process.env.STOREFRONT_TOKEN;

/** Checkout appears only when the admin connection is configured. */
export const checkoutEnabled = Boolean(url && token);

export async function adminFetch(path: string, init: RequestInit = {}) {
  if (!url || !token) throw new Error("ADMIN_API_URL and STOREFRONT_TOKEN are not set");
  return fetch(`${url.replace(/\/$/, "")}/api/storefront/v1${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
}

/** The public origin (https://…). Behind the server's proxy the request itself says http. */
export const siteOrigin = (req: Request) => process.env.SITE_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
