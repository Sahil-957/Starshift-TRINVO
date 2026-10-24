# TINVO — Multi-Store Admin Platform: Architecture Proposal

**Status:** proposal, awaiting approval. No code written yet beyond this document.
**Date:** 24 October 2026
**Scope:** response to the multi-store admin platform brief — findings, proposed
architecture, data model, deployment and sequencing.

---

## 1. What is actually in the repository today

I inspected the whole repo before proposing anything. The headline finding changes
the risk profile of this project significantly.

**There is no backend. At all.**

| Area | Current state |
| --- | --- |
| Runtime dependencies | Three: `next`, `react`, `react-dom` |
| API routes | None |
| Middleware | None |
| Server actions | None |
| Database | None |
| ORM | None |
| Authentication | None |
| Cart / checkout | None |
| Orders / customers | None |
| Rendering | 100% static — all 27 routes prerendered at build |
| "Data" layer | 881 lines of hand-edited TypeScript literals in `src/data/` |
| Version control | Git, on `main`, remote `Sahil-957/Starshift-TRINVO` |
| CI / deployment config | None in repo |
| Environment files | None |

The storefront is a presentation layer. It reads constants and renders HTML at build
time. Nothing executes at request time.

### Why this matters

The brief is careful about not rewriting the project and not starting major
refactoring. That caution is well placed in general, but here it is mostly
unnecessary: **there is nothing to refactor.** No commerce logic exists to migrate,
no schema to reshape, no auth to rework.

The admin platform is a greenfield build. The only change the storefront needs is
swapping its data source — `import { products } from "@/data/products"` becomes a
typed API call. Every component, route, layout and style stays exactly as it is.

That makes Phase 1 low-risk, and it means the multi-store data model can be designed
correctly from the start rather than retrofitted. Which is what the brief asks for.

### Version control

The storefront is a git repository on `main` with a GitHub remote. No CI is
configured, and there is no branch protection — worth adding both before the
storefront starts depending on a live API, but neither blocks this work.

---

## 2. Proposed architecture

### 2.1 Repository structure — separate projects, admin as the backend

**Decided: the admin platform is its own standalone project and repository.** The
TINVO storefront stays exactly where it is, as its own project, and is *added to*
the admin as its first connected shop.

```
tinvo-admin/                  # new, standalone repo
├─ src/app/(dashboard)/       # organisation dashboard, shop switcher
├─ src/app/(shop)/[shopId]/   # per-shop management
├─ src/app/api/v1/            # the public, shop-scoped storefront API
├─ src/db/                    # Drizzle schema + migrations
├─ src/core/                  # commerce domain logic, shop-scoped
└─ src/auth/

tinvo-storefront/             # the existing repo, stays put
└─ src/                       # unchanged; data source swaps to the API
```

This works — and avoids the duplication problem I raised earlier — because of one
structural decision:

> **The admin platform is the backend. Storefronts are presentation only.**

All commerce logic (pricing, carts, orders, payments, refunds, fulfilment, policy)
lives in the admin project and runs there. A storefront renders what the API returns
and posts user intent back. It holds no business rules, no database credentials and
no commerce calculations of its own.

With that boundary held, there is nothing to duplicate across storefronts, so a
monorepo buys little. Two separate repos give cleaner deployment, independent
release cadence, and a genuinely enforced separation — the storefront *cannot*
import from the admin, because it isn't there.

**The one rule that keeps this honest:** if commerce logic ever starts appearing in a
storefront — discount maths, tax rules, stock decisions — the duplication problem
comes back for every future brand. Keep storefronts thin.

#### Sharing types between the two repos

The only thing both sides genuinely need is the API's request and response types.
Three options, cheapest first:

1. **Generate an OpenAPI schema** from the admin's Zod validators and generate a
   typed client into the storefront. One command, no publishing. **Recommended.**
2. **Publish a small `@tinvo/api-client` package** to a private npm registry or
   GitHub Packages. Cleanest consumer experience, adds a release step.
3. **Copy a single `types.ts`** into each storefront. Fine for one or two
   storefronts, drifts badly beyond that.

Start with option 1 and move to option 2 if a third storefront appears.

### 2.2 Stack recommendations

Chosen to extend the current stack rather than replace it. Next.js 16, React 19,
TypeScript and Tailwind v4 all stay.

**Decided** (24 Oct 2026): Supabase, Auth.js, Razorpay, and currency configurable
per shop from the admin.

| Concern | Decision | Notes |
| --- | --- | --- |
| Database | **Supabase Postgres** | Postgres with RLS built in, plus Storage for product images and a usable SQL editor. Used as a database — see §2.3 on what this means alongside Auth.js. |
| ORM | **Drizzle** | TypeScript-native, SQL-transparent, first-class migrations, light runtime. |
| Auth | **Auth.js v5** + Drizzle adapter | Self-hosted sessions, supports the staff accounts and role model. **Not** Supabase Auth — see §2.3. |
| Payments | **Razorpay** | UPI, cards, netbanking, COD reconciliation. Settles in INR — see §3.6. |
| File storage | **Supabase Storage** | Product images, with signed upload URLs. Avoids a second vendor. |
| Admin API | Server Actions for admin UI; versioned REST for storefronts | Server Actions keep admin writes simple and typed. Storefronts need a stable, authenticated contract. |
| Money | Integer minor units, never floats | Non-negotiable. Floats lose money. |
| Validation | Zod at every trust boundary | Request bodies, webhooks, server action inputs. |

### 2.3 Auth.js on Supabase — what this combination implies

These two choices are compatible, but they interact in a way worth settling now
rather than discovering in Phase 1.

**We use Supabase as Postgres and Storage, not as an auth provider.** Auth.js owns
sessions, users and roles; the `users` table is ours, written by the Drizzle adapter.
Supabase Auth stays switched off. Mixing the two would give two sources of truth for
identity, which is exactly the kind of thing that produces a permissions bug.

Two concrete consequences:

**1. RLS cannot use `auth.uid()`.** Supabase's standard RLS idiom reads the Supabase
Auth JWT, which we will not have. Our policies key on a session variable the
application sets instead:

```sql
CREATE POLICY shop_isolation ON products
  USING (shop_id = current_setting('app.current_shop_id', true)::uuid);
```

**2. The pooler forces transaction scope.** Supabase's connection pooler runs in
transaction mode, where a plain `SET` does not persist between statements. The
variable must be set *inside* the transaction that uses it:

```ts
db.transaction(async (tx) => {
  await tx.execute(sql`SELECT set_config('app.current_shop_id', ${shopId}, true)`);
  // ...queries here are now shop-scoped by the database itself
});
```

The `true` makes it transaction-local. This is a hard design constraint on the
repository layer: **every shop-scoped read or write runs inside a transaction that
sets the variable first.** Building that into the `ShopContext` accessor from day one
makes it automatic; bolting it on later means auditing every query.

Migrations and the Auth.js adapter connect as a privileged role that bypasses RLS.
Application queries connect as a restricted role that does not.

### 2.4 Shop isolation — three layers, not one

The brief is explicit that frontend filtering is not sufficient. I propose three
enforced layers:

1. **Schema.** Every shop-owned table carries `shop_id UUID NOT NULL REFERENCES shops(id)`.
   Composite unique constraints are scoped by shop — for example a product slug is
   unique per shop, not globally, so two brands can both have `/shop/classic`.
   Cross-table foreign keys carry `shop_id` so a child row cannot point at a parent
   in a different shop.

2. **Application.** No query may be constructed without a `ShopContext`. The
   repository layer in the admin's `src/core` takes the context as a constructor argument
   and injects the `shop_id` predicate itself. There is no exported function that
   reads a shop-owned table without one. This makes cross-shop leakage a compile
   error rather than a code-review question.

3. **Database.** Postgres row-level security on every shop-owned table, keyed on a
   `app.current_shop_id` session variable set per request. This is defence in depth:
   if application code is ever wrong, the database still refuses.

Layer 2 is the one that does the day-to-day work. Layer 3 is what makes the
guarantee hold when someone makes a mistake at 2am.

---

## 3. Data model

Abbreviated — columns shown are the structurally significant ones, not the full set.

### 3.1 Organisation and access

```
organisations        id, name, created_at
users                id, email, name, password_hash | oauth, created_at
organisation_members org_id, user_id, role            -- owner | admin
shops                id, org_id, name, slug, status, logo_url, currency,
                     primary_domain, archived_at
shop_members         shop_id, user_id, role           -- manager | staff
```

Access resolution: organisation owners and admins reach every shop in the
organisation. Shop managers and staff reach only shops they are rows in. A single
`assertCanAccess(user, shopId, action)` runs server-side on every protected path.

### 3.2 Catalogue — per shop

```
products          id, shop_id, title, slug, status(draft|active|archived),
                  description, seo_title, seo_description, created_at
product_variants  id, shop_id, product_id, sku, title,
                  price_minor, compare_at_minor, currency,
                  inventory_policy(track|print_on_demand|none), inventory_qty
product_images    id, shop_id, product_id, storage_path, alt, kind, position
categories        id, shop_id, name, slug, parent_id
collections       id, shop_id, title, slug, rule_type(manual|automatic), rules_json
product_specs     id, shop_id, product_id, key, value   -- the current spec sheet
suppliers         id, shop_id, name, provider_key       -- 'qikink', others later
product_fulfilment product_id, supplier_id, external_sku,
                   cost_minor, cost_currency,
                   cost_source(auto|manual), cost_synced_at
```

Note `suppliers` is per shop and keyed by provider. Nothing assumes drinkware and
nothing assumes Qikink — TINVO is simply the first shop with a Qikink supplier row.

### 3.3 Commerce — per shop

```
customers         id, shop_id, email, name, phone      -- unique (shop_id, email)
addresses         id, shop_id, customer_id, ...
orders            id, shop_id, order_number, customer_id, status,
                  settlement_currency, subtotal_minor, discount_minor,
                  shipping_minor, tax_minor, total_minor,
                  presentment_currency, presentment_total_minor, fx_rate,
                  placed_at
order_items       id, shop_id, order_id, variant_id,
                  title_snapshot, unit_price_minor, qty
payments          id, shop_id, order_id, gateway,
                  razorpay_order_id, razorpay_payment_id, method,
                  amount_minor, status, captured_at
refunds           id, shop_id, order_id, payment_id,
                  razorpay_refund_id, amount_minor, status, reason
fulfilments       id, shop_id, order_id, provider, external_ref,
                  tracking_number, status
returns           id, shop_id, order_id, status, reason, evidence_json
discounts         id, shop_id, code, type, value, starts_at, ends_at
order_events      id, shop_id, order_id, type, payload_json, created_at
```

**Order numbers are shop-qualified** via a per-shop sequence — `TNV-1001`, `BR2-1001`.
Two shops can hold the same number without collision, and a number is unambiguous in
support conversations.

**Line items snapshot their title and price.** An order must never change because a
product was later edited.

### 3.4 Settings, integrations, audit

```
shop_settings     shop_id, key, value_json            -- tax, COD, notifications, SEO
shop_policies     shop_id, kind, content_json         -- returns/refund/warranty
shop_credentials  shop_id, provider, encrypted_payload -- gateway + supplier secrets
api_keys          id, shop_id, name, key_hash, scopes, last_used_at, revoked_at
webhook_events    id, shop_id, provider, external_id, payload_json, processed_at
audit_logs        id, org_id, shop_id, actor_user_id, action,
                  target_type, target_id, before_json, after_json, created_at
```

`shop_credentials` holds encrypted values, decrypted only server-side, never
serialised to a client component or a `NEXT_PUBLIC_` variable.

`webhook_events` has a unique index on `(provider, external_id)` — that is what makes
webhook processing idempotent, as the brief requires.

`audit_logs` is append-only (no UPDATE/DELETE grant) and covers refunds, payment
changes, price updates and permission changes.

### 3.5 Archival, not deletion

Shops carry `archived_at`. Archiving hides a shop from the switcher and blocks new
orders. It **never** cascades into orders, payments or refunds — those are financial
records with retention obligations. All shop-owned foreign keys use `ON DELETE RESTRICT`,
so a hard delete fails loudly rather than destroying history silently. That is the
brief's critical test 7, enforced by the schema rather than by discipline.

---

### 3.6 Money and currency

Currency is configurable per shop from the admin, as decided. There is an important
distinction to build in from the start, because retrofitting it is painful.

**Settlement currency** is what the gateway actually pays you in. **Presentment
currency** is what a customer sees and is charged in. They are not the same thing,
and Razorpay makes the difference concrete: it accepts international cards but
**settles Indian accounts in INR**. So TINVO can *display* prices in USD or AED, but
the money arrives as INR at Razorpay's conversion rate.

Schema:

```
shops            id, ..., settlement_currency        -- INR for TINVO; fixed per shop
shop_currencies  shop_id, currency, is_default,
                 rate_mode(manual|auto), manual_rate, rounding_rule
```

Rules that follow from this:

- **Accounting is always in settlement currency.** `orders.total_minor` and every
  financial aggregate are stored in the shop's settlement currency. Reports never mix
  units.
- **Presentment amounts are stored alongside, not instead.** An order records
  `presentment_currency`, `presentment_total_minor` and the `fx_rate` used, frozen at
  the moment of purchase. A rate change next week must not alter last week's order.
- **Minor units vary by currency.** INR and USD have two decimal places; JPY has
  zero; KWD has three. Store the exponent per currency rather than assuming 100.
- **Organisation-wide reports need one reporting currency.** Summing shops that
  settle in different currencies requires an explicit conversion with a stated rate
  and date, labelled as such in the UI. A total with no currency attached is a bug.

**Recommendation for launch:** TINVO ships INR-only — one row in `shop_currencies`.
The tables and the frozen-rate discipline exist from Phase 1, so enabling a second
presentment currency later is a settings change rather than a migration. That is what
"decided through the admin dashboard" buys you, without paying the complexity cost
before there is a second currency to show.

### 3.7 GST — Maharashtra origin

The business is registered in **Maharashtra**, which fixes the place-of-supply logic.
This is not a display detail; it changes what goes on every order and invoice, so it
belongs in the schema from Phase 1.

**How Indian GST splits on goods.** Place of supply is where delivery terminates —
the customer's address. Origin is Maharashtra. Therefore:

| Customer ships to | Treatment | Tax lines on an 18% item |
| --- | --- | --- |
| Maharashtra | Intra-state | CGST 9% + SGST 9% |
| Any other state | Inter-state | IGST 18% |

The customer pays the same 18% either way. What differs is how it is split, reported
and remitted — and an invoice with the wrong split is a defective invoice.

Schema additions:

```
shops            ..., gstin, origin_state              -- 'MH' for TINVO
products         ..., hsn_code, tax_rate_bps           -- basis points: 1800 = 18%
orders           ..., place_of_supply_state, tax_treatment(intra|inter)
order_tax_lines  id, shop_id, order_id, kind(cgst|sgst|igst),
                 rate_bps, taxable_value_minor, amount_minor
```

Tax lines are stored per order, computed at purchase and never recalculated. A rate
change next year must not alter a historical invoice.

**Prices are displayed tax-inclusive.** This is effectively mandatory for B2C retail
in India — a displayed price must be the all-inclusive amount a customer pays. So
`price_minor` is the inclusive figure, and taxable value is derived:

```
taxable_value = round(price_minor × 10000 / (10000 + tax_rate_bps))
tax_amount    = price_minor − taxable_value
```

Back-calculating is the correct direction here. Storing an exclusive price and adding
tax produces rounding drift against the round number shown on the site.

**Shipping is taxed at the same rate as the goods** when charged as part of the same
supply, rather than being tax-free. Worth getting right from the first order.

**Two things for your CA to confirm, not me:**

1. **HSN code and rate.** A stainless steel vacuum flask is commonly classified under
   HSN 9617, and Qikink charges 18% on the tumbler, which is consistent — but HSN
   classification is a professional judgement, and it drives every invoice.
2. **Whether registration is mandatory now.** The ordinary threshold is ₹40 lakh, but
   inter-state supply of goods generally triggers mandatory registration regardless
   of turnover. If TINVO ships outside Maharashtra on day one, a GSTIN is likely
   required from the first order rather than at a turnover milestone. Confirm before
   launch — this one has penalties attached.

The platform handles both cases: `shops.gstin` is nullable, and tax lines are only
computed when it is set.

---

## 4. Reporting — define the metrics before building the charts

The brief rightly warns against treating gross sales, net sales and profit as
interchangeable. Proposed definitions, to be agreed before any dashboard is built:

| Metric | Definition |
| --- | --- |
| Gross sales | Sum of line items at sold price, before discounts, excluding tax and shipping |
| Discounts | Total discount applied |
| Returns | Value of refunded line items |
| **Net sales** | Gross sales − discounts − returns |
| Tax | Collected tax, never counted as revenue |
| Shipping | Charged to customer, reported separately |
| **Total revenue** | Net sales + shipping + tax collected |
| Cost of goods | Supplier cost (for TINVO, the Qikink base price) |
| **Gross profit** | Net sales − cost of goods |
| AOV | Net sales ÷ order count |

Two scopes, as specified: an organisation roll-up (totals, sales by shop, orders
needing attention, comparison) and a per-shop view (sales, AOV, best sellers, payment
and fulfilment status, returns, product performance). The roll-up aggregates only
shops the signed-in user may access — a shop manager's organisation view shows their
shops alone, not a redacted total of everything.

**Empty shops show honest empty states.** No sample data, no placeholder charts, no
fabricated numbers — consistent with how the storefront already treats missing
photography and unverified specs.

---

## 5. Storefront integration — the Shopify model

Shopify is the right reference here, and it is worth copying one specific thing: it
exposes **two separate APIs**, not one. We should do the same, because they have
different trust levels.

### 5.1 Two APIs

**Storefront API** — `/api/storefront/v1`
Read-mostly, scoped to published data, authenticated with a per-shop storefront
token. Safe for a storefront to hold. Cannot see draft products, customer lists,
other orders, settings or credentials.

```
GET  /products                 # published only
GET  /products/:slug
GET  /collections
POST /carts
POST /carts/:id/lines
POST /checkouts                # phase 3
```

**Admin API** — `/api/admin/v1`
Full CRUD, authenticated with a session or a scoped admin key, every call passed
through `assertCanAccess`. Never exposed to a browser or a storefront.

```
GET/POST/PATCH  /shops/:shopId/products
GET             /shops/:shopId/orders
POST            /shops/:shopId/refunds
...
```

**Webhooks** — `/api/webhooks/:provider`, idempotent on `(provider, external_id)`.

The split matters because a storefront token will eventually end up somewhere it
shouldn't — in a client bundle, a log, a screenshot. When that happens it should be
capable of reading a public catalogue and nothing else.

### 5.2 Adding a shop — the connection flow

This is the "add our shop to it" path, and it is deliberately the same flow every
future brand will use. Nothing about it is TINVO-specific.

1. **Create the shop** in the admin: name, logo, currency, timezone. A `shops` row
   is inserted. This is the only step that has to happen in the admin UI.
2. **Generate a storefront token** for that shop. Shown once, stored hashed. Scopes
   are explicit — `products:read`, `collections:read`, later `carts:write`.
3. **Point the storefront at it** with two environment variables:
   `TINVO_API_URL` and `TINVO_STOREFRONT_TOKEN`. No shop ID is needed, because the
   token resolves to exactly one shop server-side. A storefront cannot name a shop,
   so it cannot ask for the wrong one.
4. **Import or author the catalogue.** For TINVO, a one-off script reads the existing
   `src/data/products.ts` and POSTs it through the Admin API, so the current eight
   designs, collections, specs and policy content arrive intact.
5. **Verify, then switch.** The storefront reads from the API behind a feature flag,
   output is diffed against the current static build, and only then do the local data
   files get deleted.
6. **Connect revalidation.** Publishing in the admin fires a webhook at the
   storefront's revalidation endpoint, so pages rebuild on change rather than on a
   schedule.

Steps 4 and 5 are what make this safe: the storefront keeps working throughout, and
the local data files are not removed until the API is proven to produce identical
output.

### 5.3 What changes in the TINVO storefront

Very little. Today it imports constants; it will call a typed client. Pages move from
fully static to ISR with on-demand revalidation. Components, routes, styles, the
quiz, collections logic and support pages are untouched, because they keep consuming
the same shapes.

Per the brief: a storefront is not described as connected until its integration has
actually been implemented and tested.

---

## 6. Deployment

| Item | Proposal |
| --- | --- |
| Hosting | Vercel, **one project per repository**. `tinvo-admin` and `tinvo-storefront` deploy independently, on their own release cadence. Each future brand is another project. |
| Database | Supabase Postgres, one project, owned exclusively by the admin. **Storefronts never hold database or Supabase credentials** — they reach data only through the Storefront API with a scoped token. |
| Domains | `tinvo.in` → storefront (not yet purchased). Admin on its own domain or subdomain, to be decided. |
| Secrets | Vercel environment variables per project. The storefront holds only an API URL and a scoped storefront token. Razorpay keys, webhook secrets and supplier credentials are encrypted at rest in `shop_credentials` and never leave the admin. The Supabase service key lives in the admin only. Nothing secret is ever `NEXT_PUBLIC_`. |
| Migrations | Drizzle migrations in the admin repo, applied on deploy. A separate Supabase project for staging, since Supabase has no database branching. |
| CI | GitHub Actions in each repo: typecheck, lint, test, build on every PR. Neither repo has CI today. |

A practical consequence of two repos worth planning for: an API change touches two
repositories and cannot be deployed atomically. Version the API path (`/v1`) and
keep the old version responding until every storefront has moved. This is the main
tax of the separate-project choice, and it is a small, manageable one.

Cost at this stage is low — Vercel Hobby and Supabase's free tier cover a pre-launch
build. Budget for Supabase Pro (~$25/month) before launch: the free tier pauses an
idle project, which is fine for development and not for a live store.

---

## 7. Implementation sequence

Mapped onto the brief's phases, with a Phase 0 the brief did not account for.

### Phase 0 — Baseline (under an hour)
Commit the outstanding storefront work so the baseline is clean. Create the
`tinvo-admin` project as a sibling directory. **The storefront is not touched** —
no move, no restructure, no behaviour change.

### Phase 1 — Foundation
Postgres provisioned. Admin repo scaffolded: organisation/shop/user/membership schema
and migrations, RLS policies, Auth.js with the first owner account. Admin shell:
layout, sign-in, shop switcher, organisation dashboard. TINVO created as the first
shop through the normal flow in §5.2 — not seeded by a special case, so the path is
proven for brand two. `assertCanAccess` enforced on every route.
**Exit criteria:** the brief's critical tests 2 and 4 pass — a second test shop can be
created without schema changes, and a shop manager cannot reach another shop's data by
editing a URL or request parameter.

### Phase 2 — Store management
Products, variants, images, categories, collections, specs. Draft/active/archived.
Customers and orders as read models. Discounts. Per-shop settings and policies — the
existing `src/data/policy.ts` and `src/data/support.ts` content imports into
`shop_policies`. Storefront API goes live; the TINVO storefront migrates onto it
behind a feature flag, is diffed against the current static output, and only then are
the local data files deleted.
**Exit criteria:** tests 1, 3, 6 and 9 pass. TINVO's catalogue is managed from the
admin and the storefront renders from the API with identical output.

### Phase 3 — Commerce operations
Cart and checkout. Razorpay (assumed — see open questions). COD. Orders written
through the API, with GST computed per §3.7. Refunds and returns wired to the policy
already published. Qikink
fulfilment integration with idempotent webhooks. Notifications.
**Exit criteria:** a real order can be placed, paid, fulfilled, tracked and refunded.

### Phase 4 — Analytics and expansion
Organisation and per-shop reports against the metric definitions in section 4. Staff
accounts and the full permission matrix. Second storefront connected to prove the
integration layer.
**Exit criteria:** tests 5, 7, 8 and 10 pass.

Phases ship sequentially. A working, secure foundation before advanced features.

---

## 8. How each critical test is satisfied

| # | Test | Mechanism |
| --- | --- | --- |
| 1 | TINVO data only in TINVO context | `shop_id` predicate injected by repository layer; RLS backstop |
| 2 | Second shop without schema change | Shop is a row, not a code path; verified by seeding a test shop in Phase 1 |
| 3 | Switching shops changes all data | Shop context resolved server-side per request, not client state |
| 4 | Manager cannot cross shops via URL | `assertCanAccess` on every handler; automated test attempts the attack |
| 5 | Org reports aggregate correctly | Aggregates run over the authorised shop set only |
| 6 | Settings and credentials independent | Per-shop rows in `shop_settings` / `shop_credentials`; no global fallback without explicit opt-in |
| 7 | Archiving never destroys records | `archived_at` + `ON DELETE RESTRICT` on financial tables |
| 8 | Storefronts connect via documented interface | Storefront API + the §5.2 connection flow; TINVO is the first proof, using the same path brand two will use |
| 9 | Empty shops show honest empty states | Explicit empty states, no seeded demo data |
| 10 | TINVO storefront stays intact | Phase 0 does not touch it; Phase 2 swaps only the data source, behind a flag, diffed before cutover |

Tests 1, 4 and 7 become automated tests in CI, not manual checks. An isolation
guarantee that is only ever verified by hand will eventually be wrong.

---

## 9. Decisions and remaining questions

### Settled — 24 October 2026

| Question | Decision | Consequence |
| --- | --- | --- |
| Payment gateway | **Razorpay** | `payments` / `refunds` carry Razorpay identifiers. Settles INR — drives the currency model in §3.6. |
| Authentication | **Auth.js v5** | Self-hosted sessions, our own `users` table, full role model. |
| Database | **Supabase** | Postgres + Storage. Supabase Auth stays off; RLS keys on a session variable, not `auth.uid()` — §2.4. |
| Currency | **Per-shop, set in the admin** | `shop_currencies` from Phase 1; TINVO launches INR-only. Settlement and presentment kept separate — §3.6. |
| Admin domain | **Deferred — local development** | No domain needed. The admin runs on localhost through Phases 1–2; a domain is only required when it first deploys. |
| Cost of goods | **Pull from Qikink** | Target design. Blocked on API access — see below. Schema supports `auto` and `manual` sources so the manual path works from day one. |
| Tax | **GST, Maharashtra origin** | CGST+SGST within Maharashtra, IGST elsewhere. Tax-inclusive display. Full model in §3.7. |

Nothing now blocks Phase 1 design.

### Local development setup

Nothing here needs a purchased domain or a deployment.

| Piece | Local setup |
| --- | --- |
| Admin | `next dev` on `localhost:3001` |
| Storefront | `next dev` on `localhost:3000` (unchanged) |
| Database | Supabase CLI (`supabase start`) runs Postgres + Storage in Docker, or a free hosted dev project if Docker is a nuisance |
| Auth.js | `AUTH_URL=http://localhost:3001`, credentials provider for the first owner account |
| Razorpay | Test-mode keys — no KYC needed, full checkout flow works |
| Webhooks | A tunnel (`ngrok` or the Razorpay CLI) to receive callbacks locally |

The local Supabase stack matters more than it sounds: it means RLS policies and
migrations get tested against real Postgres rather than discovered in production.

### Blocked — needs an answer from Qikink

**Qikink publishes no developer API.** I checked their
[help centre](https://qikink.com/help/) and
[integrations hub](https://qikink.com/help/integrations/): there are Shopify and
WooCommerce integrations, but no documented API, no API keys, no webhooks and no
programmatic access to pricing. Orders appear to be placed through their dashboard.

This affects two things:

1. **Pulling COGS automatically** — the decided approach — has nothing to call yet.
2. **Phase 3 fulfilment** is a larger question: if there is no order API, submitting
   orders to Qikink may be manual, CSV-based, or require routing through their
   Shopify integration. That is a meaningful constraint on an automated store.

**Action: email care@qikink.com** and ask directly whether API access, order
submission endpoints and webhooks are available to merchants. Worth doing now —
it is the single biggest unknown in Phase 3, and the answer may influence whether
Qikink stays the fulfilment provider at volume.

**How the design absorbs either answer:** supplier integration sits behind a
provider adapter interface. `cost_source` is `manual` until an API exists, with cost
entered once per product and a `cost_synced_at` timestamp showing staleness. If
Qikink confirms an API, an adapter fills the same columns automatically and nothing
else changes. If they never do, the manual path is already working and a different
provider can be added without touching the schema.

### Still open — needed by Phase 2, not before

1. **Razorpay account state.** Is the account created and KYC-verified? Live keys
   take days to issue. Test keys unblock everything until Phase 3.
2. **GSTIN and HSN classification.** Both need your CA — see the two items at the
   end of §3.7. The registration-threshold question is the one with penalties
   attached, so worth asking early.

---

## 10. Honest risks

- **Scope.** This is a Shopify-shaped product, and the comparison is accurate in both
  directions: the architecture is right, and Shopify has spent fifteen years on it.
  Phases 1–3 are a serious build, not a weekend. The phasing exists so there is
  something working and secure at each stop.
- **Commerce logic creeping into storefronts.** The separate-repo structure only
  stays clean while storefronts remain presentation-only. The first discount
  calculation written in a storefront is the moment brand two starts costing double.
  Worth a boundary check at every phase review.
- **Two repos cannot deploy atomically.** API changes need versioning and a
  deprecation window rather than a coordinated release.
- **Qikink has no documented API.** This is the largest unknown in the plan. An
  automated store whose fulfilment step is manual is only half automated, and the
  answer may decide whether Qikink remains the provider at volume. The adapter
  interface keeps the rest of the system indifferent to the outcome, but the
  question should be asked now rather than in Phase 3.
- **GST is a legal obligation, not a feature.** Wrong tax splits mean defective
  invoices. The mechanism is in §3.7; the classification and registration questions
  need a CA before the first real order.
- **Multi-store before a second store exists.** The brief asks for it deliberately and
  I agree with the reasoning — retrofitting tenancy is far more expensive than
  designing it in. The cost is some extra structure while TINVO is the only shop.
- **Payments and refunds are real money.** They need tests and an audit trail from day
  one, which is why `audit_logs` is in Phase 1's schema rather than deferred.
- **No CI on either repo.** Typecheck, lint and the isolation tests should run on
  every push before the storefront depends on a live API.
