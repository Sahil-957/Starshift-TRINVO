/**
 * Full Qikink sandbox run: every order feature we will use, plus the failures
 * our code must handle. Places real sandbox orders (no charge).
 *
 *   npm run qikink:test
 */
import { createOrder, getToken, type LineItem, type NewOrder } from "../src/lib/qikink.ts";

if (process.env.QIKINK_ENV === "live") throw new Error("Sandbox only. Unset QIKINK_ENV=live.");

const host = "https://sandbox.qikink.com";
const raw = "https://raw.githubusercontent.com/Sahil-957/Starshift-TRINVO/main/";
const run = Date.now().toString(36).slice(-5);
let n = 0;
const num = () => `t${run}_${++n}`; // <= 15 chars

const address: NewOrder["shipping_address"] = {
  first_name: "Test",
  last_name: "Order",
  address1: "Flat 4, Sea View Apartments, Linking Road",
  address2: "Bandra West",
  phone: "9876543210",
  email: "test@example.com",
  city: "Mumbai",
  zip: "400050",
  province: "Maharashtra",
  country_code: "IN",
};

const tumbler = (code: string, wrap: string, slug: string, qty = 1, isNew = true): LineItem => ({
  search_from_my_products: 0,
  sku: "UTumb-Wh-20oz",
  print_type_id: "5",
  quantity: String(qty),
  price: "949",
  designs: [
    {
      design_code: code,
      width_inches: isNew ? "9.3" : "",
      height_inches: isNew ? "8" : "",
      placement_sku: "fr",
      design_link: isNew ? `${raw}resized/With%20Logo/${encodeURIComponent(wrap)}` : "",
      mockup_link: `${raw}public/products/${slug}-hero.webp`,
    },
  ],
});

const order = (over: Partial<NewOrder> = {}): NewOrder => ({
  order_number: num(),
  qikink_shipping: "1",
  gateway: "Prepaid",
  total_order_value: "949",
  line_items: [tumbler(`tv_${run}_navy`, "Navy Blue.png", "midnight-slate")],
  shipping_address: address,
  ...over,
});

/** Bypasses our client-side checks so we see Qikink's own validation. */
async function post(body: unknown, token?: string) {
  const res = await fetch(`${host}/api/order/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ClientId: process.env.QIKINK_CLIENT_ID!,
      Accesstoken: token ?? (await getToken()),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

type Case = { name: string; expect: "ok" | RegExp; run: () => Promise<string> };
const created: string[] = [];
const ok = async (o: NewOrder) => {
  const r = await createOrder(o);
  created.push(`${o.order_number} -> ${r.order_id}`);
  return `order_id ${r.order_id}`;
};
const fails = async (body: unknown, token?: string) => {
  const r = await post(body, token);
  if (r.status === 200 && /success/i.test(r.body)) throw new Error(`accepted: ${r.body}`);
  return `${r.status} ${r.body}`;
};

let first: NewOrder;
const cases: Case[] = [
  // what checkout will send
  { name: "new design, Prepaid", expect: "ok", run: () => ok((first = order())) },
  {
    name: "reuse existing design code (no link/size)",
    expect: "ok",
    run: () => ok(order({ line_items: [tumbler(`tv_${run}_navy`, "", "midnight-slate", 1, false)] })),
  },
  { name: "COD", expect: "ok", run: () => ok(order({ gateway: "COD" })) },
  {
    name: "two designs, qty 2 + 1",
    expect: "ok",
    run: () =>
      ok(
        order({
          total_order_value: String(949 * 3),
          line_items: [
            tumbler(`tv_${run}_gold`, "Golden Foil.png", "aurora-gilt", 2),
            tumbler(`tv_${run}_pink`, "Baby Pink.png", "pink-serenity"),
          ],
        }),
      ),
  },
  { name: "add-ons: box packing + gift wrap", expect: "ok", run: () => ok(order({ add_ons: [{ box_packing: 1, gift_wrap: 1 }] })) },

  // failures our code has to survive
  { name: "duplicate order_number", expect: /./, run: () => fails({ ...first, line_items: first.line_items }) },
  { name: "wrong gateway case", expect: /gateway/i, run: () => fails({ ...order(), gateway: "prepaid" }) },
  {
    name: "missing phone",
    expect: /phone/i,
    run: () => {
      const noPhone: Partial<NewOrder["shipping_address"]> = { ...address };
      delete noPhone.phone;
      return fails({ ...order(), shipping_address: noPhone });
    },
  },
  { name: "address1 over 90 chars", expect: /90/, run: () => fails({ ...order(), shipping_address: { ...address, address1: "x".repeat(91) } }) },
  { name: "unknown field", expect: /unexpected/i, run: () => fails({ ...order(), coupon: "X" }) },
  { name: "unknown SKU", expect: /sku/i, run: () => fails({ ...order(), line_items: [{ ...tumbler("x", "Navy Blue.png", "midnight-slate"), sku: "NOPE-1" }] }) },
  { name: "bad access token", expect: /./, run: () => fails(order(), "not-a-token") },
  {
    name: "old token after a new one is issued",
    expect: /./,
    run: async () => {
      const old = await getToken(undefined, true);
      await getToken(undefined, true);
      return fails(order(), old);
    },
  },
  {
    name: "order list (documented as unavailable in sandbox)",
    expect: /./,
    run: async () => {
      const res = await fetch(`${host}/api/order/list?page_no=1`, {
        headers: { ClientId: process.env.QIKINK_CLIENT_ID!, Accesstoken: await getToken() },
      });
      return `${res.status} ${(await res.text()).slice(0, 160)}`;
    },
  },
];

console.log(`Qikink sandbox test, run ${run}\n`);
let bad = 0;
for (const c of cases) {
  let line: string;
  try {
    const out = await c.run();
    const pass = c.expect === "ok" || c.expect.test(out);
    if (!pass) bad++;
    line = `${pass ? "PASS" : "FAIL"}  ${c.name}: ${out}`;
  } catch (e) {
    const msg = (e as Error).message;
    const pass = c.expect !== "ok" && c.expect.test(msg);
    if (!pass) bad++;
    line = `${pass ? "PASS" : "FAIL"}  ${c.name}: ${msg}`;
  }
  console.log(line.replace(/\s+/g, " ").slice(0, 260));
  await new Promise((r) => setTimeout(r, 1100)); // well under 60 requests/min
}

console.log(`\nSandbox orders created:\n  ${created.join("\n  ") || "none"}`);
console.log(`\n${cases.length - bad}/${cases.length} passed`);
process.exitCode = bad ? 1 : 0;
