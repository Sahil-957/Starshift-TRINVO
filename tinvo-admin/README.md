# TINVO Admin

The back office for every shop: one organisation, many brands. The admin owns the
database, payments (PayU), fulfilment (Qikink) and orders; storefronts only
display what it serves. Plan: [docs/admin-platform-proposal.md](../docs/admin-platform-proposal.md).

## What it does

| Screen | |
|---|---|
| **Shops** (home) | every shop you can open, with 30-day orders and revenue; create a shop |
| **Overview** | set-up checklist, last 30 days, recent orders |
| **Orders** | filter by status, sync tracking from Qikink; each order shows items, GST lines, payment, fulfilment, timeline; retry sending to Qikink, cancel unpaid, refund (owner/admin) |
| **Products** | price, compare-at, cost and margin, GST rate/HSN, Qikink SKU/print file; publish to storefront |
| **Reports** | 7/30/90/365 days: gross and net sales, refunds, tax, shipping, revenue, cost of goods, profit, AOV, best sellers |
| **Team** | add managers (edit) or staff (view only) to one shop |
| **Settings** | shop details (GSTIN, state, order prefix, domain), shipping, PayU and Qikink keys (encrypted), storefront tokens, archive |

## Run it

```bash
npm install              # from the repo root (npm workspaces)
npm run admin            # from the root: http://localhost:3001
```

`.env.local` points at the Neon **dev** branch. Never develop against production.

## Set up a database (dev, then production)

```bash
npm run db:migrate                        # tables + row-level security (owner role)
npm run owner:create                      # your account + organisation
# sign in, create the shop (New shop), then:
npm run print-files:upload -- tinvo       # wrap files -> private storage
npm run catalogue:import -- tinvo         # the 10 designs, as products
```

For production, switch `.env.local` first and back afterwards:
`neon checkout production --env .env.local` … `neon checkout dev --env .env.local`.
The app follows the branch automatically: its URL is built from the pulled
`DATABASE_URL` with `TINVO_APP_PASSWORD`. Scripts print the branch they will change.

## Go live, per shop (Settings)

1. **Qikink**: client ID + secret, sandbox or live. Keys are tested before saving.
2. **PayU**: Merchant Key and "Salt - 32 bit" (PayU → Developer → API Details), Live or
   Test. In PayU → Settings → Webhooks, add the URL shown on the Settings page for
   successful and failed payments.
3. **Storefront token**: create one; put it in the storefront's env as
   `STOREFRONT_TOKEN`, with `ADMIN_API_URL` = this admin's URL.
4. **Deploy hook**: paste the storefront's Vercel deploy hook so *Publish to
   storefront* rebuilds it after product edits.
5. Order tracking syncs from Qikink every 30 minutes (server timer, needs `CRON_SECRET`).
6. **Email** (optional): `SMTP_USER`/`SMTP_PASS` (a Gmail App Password) and `ALERT_EMAIL`.
   You get: each paid order, any order Qikink refuses, a sync that starts failing.
   Customers get: "order confirmed" after paying, "shipped" with tracking.

## How an order flows

storefront cart → `POST /api/storefront/v1/checkouts` (admin prices it from the
database, adds shipping and GST, signs a PayU payment request) → customer pays on
PayU's page → PayU's reverse hash and the amount are checked (on the customer's return,
the webhook, **or** the 30-minute reconciliation that asks PayU directly; whichever comes
first marks it paid, once) → sent to Qikink with a 7-day private link to the print file →
cron pulls status, courier and AWB → customer tracks it at `/order` on the storefront.

## Checks

| Command | Proves |
|---|---|
| `npm test` | shop isolation (roles, URL tampering, row-level security, append-only history), GST maths, the whole order lifecycle against the Qikink sandbox, with PayU signatures computed from PayU's published formulas (PayU's verify/refund replies simulated). Dev branch only. |
| `npm run neon:check` | Postgres write/read, private storage + signed links |
| `npm run qikink:check` / `qikink:test` | Qikink login / full sandbox run |
| `GET /api/health` | database and storage reachable from the running app |

## How isolation works

1. Every shop-owned table has `shop_id`; foreign keys are `ON DELETE RESTRICT`.
2. Every page and action calls `requireShop(shopId, action)`; no access is a 404.
3. The app connects as `tinvo_app`, which row-level security applies to, and reads
   shop data inside `withShop(shopId, …)`. Migrations use the owner role.
4. A storefront token resolves to exactly one shop; storefronts never hold database
   or payment credentials.
