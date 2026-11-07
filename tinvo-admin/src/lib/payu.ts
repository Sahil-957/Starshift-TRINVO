/**
 * PayU India, hosted checkout (the customer pays on PayU's page and is posted back).
 * Docs: https://docs.payu.in/docs/prebuilt-checkout-page-integration
 *
 * Every request is signed with SHA-512 over the fields and the merchant Salt;
 * every response is signed back in reverse order. Nothing is trusted unsigned.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export type PayuCreds = { key: string; salt: string; env: "test" | "live" };

const sha512 = (s: string) => createHash("sha512").update(s).digest("hex");

export const paymentUrl = (c: PayuCreds) =>
  c.env === "live" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";
const serviceUrl = (c: PayuCreds) =>
  c.env === "live" ? "https://info.payu.in/merchant/postservice?form=2" : "https://test.payu.in/merchant/postservice?form=2";

/** Paise -> "1490.00", the amount format PayU signs and echoes back. */
export const amount = (minor: number) => (minor / 100).toFixed(2);

export type PayuRequest = {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
};

/** The fields the browser posts to PayU, including the request hash. */
export function signRequest(c: PayuCreds, r: PayuRequest) {
  // sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT), udfs empty
  const hash = sha512(
    [c.key, r.txnid, r.amount, r.productinfo, r.firstname, r.email, "", "", "", "", "", "", "", "", "", "", c.salt].join("|"),
  );
  return { key: c.key, ...r, hash };
}

/**
 * Checks PayU's response (posted to surl/furl, or a webhook).
 * sha512([additionalCharges|]SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyResponse(c: PayuCreds, p: Record<string, string>) {
  const parts = [
    c.salt,
    p.status ?? "",
    "", "", "", "", "",
    p.udf5 ?? "", p.udf4 ?? "", p.udf3 ?? "", p.udf2 ?? "", p.udf1 ?? "",
    p.email ?? "", p.firstname ?? "", p.productinfo ?? "", p.amount ?? "", p.txnid ?? "", c.key,
  ];
  if (p.additionalCharges) parts.unshift(p.additionalCharges);
  const expected = Buffer.from(sha512(parts.join("|")), "hex");
  const got = Buffer.from(p.hash ?? "", "hex");
  return p.key === c.key && got.length === expected.length && timingSafeEqual(got, expected);
}

async function command<T>(c: PayuCreds, cmd: string, vars: Record<string, string>): Promise<T> {
  const body = new URLSearchParams({
    key: c.key,
    command: cmd,
    hash: sha512([c.key, cmd, vars.var1, c.salt].join("|")),
    ...vars,
  });
  const res = await fetch(serviceUrl(c), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`PayU ${cmd} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

/** Server-to-server status of a txnid, for when the customer never comes back. */
export async function verifyPayment(c: PayuCreds, txnid: string) {
  const r = await command<{
    status: number;
    transaction_details?: Record<string, { status: string; amt: string; mihpayid: string }>;
  }>(c, "verify_payment", { var1: txnid });
  return r.transaction_details?.[txnid] ?? null;
}

/** Full or partial refund of a captured payment (by PayU's mihpayid). */
export async function refund(c: PayuCreds, mihpayid: string, minor: number, token: string) {
  const r = await command<{ status: number; msg: string; request_id?: string; error_code?: number }>(
    c,
    "cancel_refund_transaction",
    { var1: mihpayid, var2: token.slice(0, 23), var3: amount(minor) },
  );
  // PayU treats error_code 102 as success too
  if (r.status !== 1 && r.error_code !== 102) throw new Error(`PayU refund failed: ${r.msg}`);
  return { id: r.request_id ?? token, status: "queued" };
}
