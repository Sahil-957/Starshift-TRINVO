/**
 * Checks the Qikink API end to end with the keys in .env.local.
 *
 *   npm run qikink:check              token + order list
 *   npm run qikink:check -- --create  also places a test order (sandbox only)
 *
 * The sandbox can't see My Products and rejects print type 23, so the test
 * order uses the catalogue tumbler SKU with the Cocoa Noir wrap from the repo
 * (verified: sandbox order 26709312, 2026-11-02).
 */
import { createOrder, getToken, listOrders, orderNumber } from "../src/lib/qikink.ts";

const live = process.env.QIKINK_ENV === "live";
let failed = false;

async function step(name: string, run: () => Promise<string>) {
  try {
    console.log(`  ok    ${name}: ${await run()}`);
  } catch (e) {
    failed = true;
    console.log(`  FAIL  ${name}: ${(e as Error).message}`);
  }
}

console.log(`Qikink ${live ? "LIVE" : "sandbox"} check\n`);

await step("token", async () => {
  const t = await getToken();
  return `received (${t.length} chars)`;
});

if (live) {
  await step("order list", async () => {
    const r = await listOrders({ page_no: 1 });
    const statuses = [...new Set(r.data.map((o) => o.status))].join(", ") || "none";
    return `${r.pagination.total_results} orders in window; latest statuses: ${statuses}`;
  });
} else {
  console.log("  skip  order list: not available in the Qikink sandbox");
}

if (process.argv.includes("--create")) {
  if (live) {
    console.log("  skip  test order: refusing to place a real order on LIVE");
  } else {
    const raw = "https://raw.githubusercontent.com/Sahil-957/Starshift-TRINVO/main/";
    await step("test order", async () => {
      const r = await createOrder({
        order_number: orderNumber("chk"),
        qikink_shipping: "1",
        gateway: "Prepaid",
        total_order_value: "949",
        line_items: [
          {
            search_from_my_products: 0,
            sku: "UTumb-Wh-20oz", // 20 oz tumbler, white base
            print_type_id: "5",
            quantity: "1",
            price: "949",
            designs: [
              {
                design_code: "tinvo_cocoa_noir",
                width_inches: "9.3", // 4650 x 4000 px at 500 dpi
                height_inches: "8",
                placement_sku: "fr",
                design_link: `${raw}resized/With%20Logo/Voilet.png`,
                mockup_link: `${raw}public/products/cocoa-noir-hero.webp`,
              },
            ],
          },
        ],
        shipping_address: {
          first_name: "Test",
          last_name: "Order",
          address1: "1 Test Street",
          phone: "9876543210",
          email: "test@example.com",
          city: "Mumbai",
          zip: "400001",
          province: "Maharashtra",
          country_code: "IN",
        },
      });
      return `${r.message}, order_id ${r.order_id}`;
    });
  }
}

console.log(failed ? "\nSome checks failed." : "\nAll checks passed.");
process.exitCode = failed ? 1 : 0;
