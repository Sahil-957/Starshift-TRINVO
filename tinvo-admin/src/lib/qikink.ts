/**
 * Qikink Open API client (server only: it reads the client secret).
 * Reference: https://documenter.getpostman.com/view/26157218/2sBYAysUHS
 *
 * The API covers three things only: a token, creating an order and reading
 * orders back (status, AWB, tracking link). There is no catalogue, pricing,
 * cancel or webhook endpoint, so status has to be polled.
 */

/** One Qikink account. Each shop stores its own (shop_credentials); scripts use env. */
export type QikinkCreds = { clientId: string; clientSecret: string; env: "sandbox" | "live" };

export function envCreds(): QikinkCreds {
  const clientId = process.env.QIKINK_CLIENT_ID;
  const clientSecret = process.env.QIKINK_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET must be set");
  return { clientId, clientSecret, env: process.env.QIKINK_ENV === "live" ? "live" : "sandbox" };
}

const base = (c: QikinkCreds) => (c.env === "live" ? "https://api.qikink.com" : "https://sandbox.qikink.com");

// Every token request invalidates the previous token, so keep one per account.
// ponytail: per-process cache; several server instances will knock each other's
// token out (handled by the single retry below). Move to a shared store (DB/KV)
// if that retry starts firing often.
const cache = new Map<string, { token: string; until: number }>();

export async function getToken(c: QikinkCreds = envCreds(), force = false): Promise<string> {
  const k = `${c.env}:${c.clientId}`;
  const hit = cache.get(k);
  if (!force && hit && Date.now() < hit.until) return hit.token;
  const res = await fetch(`${base(c)}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ClientId: c.clientId, client_secret: c.clientSecret }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.Accesstoken) {
    throw new Error(`Qikink token failed (${res.status}): ${JSON.stringify(data)}`);
  }
  // refresh a minute early
  const entry = { token: data.Accesstoken, until: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000 };
  cache.set(k, entry);
  return entry.token;
}

async function call<T>(c: QikinkCreds, path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`${base(c)}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      ClientId: c.clientId,
      Accesstoken: await getToken(c, retried),
    },
    cache: "no-store",
  });
  if ((res.status === 401 || res.status === 403) && !retried) return call(c, path, init, true);
  const data = await res.json().catch(() => ({ error: `Non-JSON response (${res.status})` }));
  if (!res.ok || data.success === false) {
    throw new Error(`Qikink ${path} failed (${res.status}): ${data.error ?? data.message ?? JSON.stringify(data)}`);
  }
  return data as T;
}

export type ShippingAddress = {
  first_name: string;
  last_name?: string;
  address1: string; // max 90 chars, overflow into address2
  address2?: string;
  phone: string;
  email: string;
  city: string;
  zip: string;
  province: string; // full state name, spelled correctly
  country_code: "IN";
};

export type LineItem =
  // a product already set up in Qikink (dashboard -> My Products)
  | { search_from_my_products: 1; sku: string; quantity: string; price: string }
  // a catalogue SKU with the design supplied here
  | {
      search_from_my_products: 0;
      sku: string;
      print_type_id: string; // 23 = sublimation
      quantity: string;
      price: string;
      designs: {
        design_code: string;
        width_inches: string;
        height_inches: string;
        placement_sku: "fr" | "bk" | "lp" | "rp" | "rs" | "ls";
        design_link: string;
        mockup_link: string;
      }[];
    };

export type NewOrder = {
  order_number: string; // unique, max 15 chars, a-z 0-9 _
  qikink_shipping: "1";
  gateway: "Prepaid" | "COD";
  total_order_value: string;
  line_items: LineItem[];
  shipping_address: ShippingAddress;
  add_ons?: { box_packing?: 0 | 1; gift_wrap?: 0 | 1; rush_order?: 0 | 1; custom_letter?: 0 | string }[];
};

/** A reference Qikink accepts: max 15 chars of a-z, 0-9 and _. */
export const orderNumber = (prefix = "tv") =>
  `${prefix}_${Date.now().toString(36)}`.toLowerCase().slice(0, 15);

export function createOrder(order: NewOrder, c: QikinkCreds = envCreds()) {
  if (!/^[a-z0-9_]{1,15}$/i.test(order.order_number)) {
    throw new Error(`order_number "${order.order_number}" must be 1-15 chars of a-z, 0-9, _`);
  }
  // the docs say omitted add-ons mean "off", but the API rejects a partial set
  const add_ons = order.add_ons?.map((a) => ({ box_packing: 0, gift_wrap: 0, rush_order: 0, custom_letter: 0, ...a }));
  return call<{ message: string; order_id: number; status_code: string }>(c, "/api/order/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...order, add_ons }),
  });
}

export type QikinkOrder = {
  order_id: number;
  number: string;
  created_on: string;
  live_date: string | null;
  status: string;
  payment_type: "Prepaid" | "COD";
  delivered_on: string | null;
  total_order_value: string;
  shipping: { awb: string | null; tracking_link: string; courier_provider_name: string | null };
  line_items: { sku: string; quantity: string; price: string }[];
};

/** Orders, 10 per page. Not available in the sandbox (Qikink's own notice). */
export function listOrders(
  query: {
    order_reference_no?: string;
    status?: string;
    id?: number;
    ids?: string;
    live_date_min?: string;
    live_date_max?: string;
    page_no?: number;
  } = {},
  c: QikinkCreds = envCreds(),
) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
  );
  return call<{
    success: true;
    data: QikinkOrder[];
    pagination: { page: number; per_page: number; total_results: number; total_pages: number; has_next: boolean };
  }>(c, `/api/order/list?${qs}`);
}

/** Qikink's many statuses, folded into ours. Unknown ones leave the order as it is. */
export function mapStatus(s: string): "in_production" | "shipped" | "delivered" | "cancelled" | "returned" | null {
  const v = s.trim().toLowerCase();
  if (v === "delivered") return "delivered";
  if (v === "cancelled") return "cancelled";
  if (["returned", "rto initiated", "partially returned", "reverse pickup initiated"].includes(v)) return "returned";
  if (
    ["in-transit", "out for delivery", "manifested", "picked up", "dispatch ready", "delivery rescheduled"].includes(v)
  )
    return "shipped";
  if (
    ["live", "to be printed", "printed", "s-printed", "partially printed", "stitched/qc", "partitally picklisted"].includes(v)
  )
    return "in_production";
  return null;
}
