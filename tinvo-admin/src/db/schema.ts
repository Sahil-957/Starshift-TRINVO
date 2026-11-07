/**
 * Schema: organisations, people, shops and access; catalogue; orders; integrations.
 *
 * Every shop-owned table carries shop_id and is guarded three ways (see
 * docs/admin-platform-proposal.md §2.4): the column, `assertCanAccess` in
 * src/core/access.ts, and a row-level security policy (drizzle/0001_rls.sql).
 * Foreign keys are ON DELETE RESTRICT: archiving hides a shop, nothing deletes history.
 */
import { sql } from "drizzle-orm";
import {
  char,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const orgRole = pgEnum("org_role", ["owner", "admin"]);
export const shopRole = pgEnum("shop_role", ["manager", "staff"]);

export const organisations = pgTable("organisations", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
  },
  // emails are stored lowercased; the index enforces it case-insensitively anyway
  (t) => [uniqueIndex("users_email_key").on(sql`lower(${t.email})`)],
);

/** Owners and admins reach every shop in their organisation. */
export const organisationMembers = pgTable(
  "organisation_members",
  {
    orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    role: orgRole("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

export const shops = pgTable(
  "shops",
  {
    id: id(),
    orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** What the gateway pays out in; fixed per shop (§3.6). */
    settlementCurrency: char("settlement_currency", { length: 3 }).notNull().default("INR"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    /** Nullable until registered; tax lines are only computed when set (§3.7). */
    gstin: text("gstin"),
    originState: char("origin_state", { length: 2 }),
    primaryDomain: text("primary_domain"),
    /** Order numbers read `${orderPrefix}-${n}`, counting per shop (§3.3). */
    orderPrefix: text("order_prefix").notNull().default("ORD"),
    nextOrderNumber: integer("next_order_number").notNull().default(1001),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("shops_org_slug_key").on(t.orgId, t.slug)],
);

/** Managers and staff reach only the shops they are listed on. */
export const shopMembers = pgTable(
  "shop_members",
  {
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    role: shopRole("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.shopId, t.userId] })],
);

/** Per-shop settings (tax, COD, notifications…). Row-level security applies. */
export const shopSettings = pgTable(
  "shop_settings",
  {
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.shopId, t.key] })],
);

/** Append-only: the app role has no UPDATE or DELETE on it (0001_rls.sql). */
export const auditLogs = pgTable("audit_logs", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organisations.id, { onDelete: "restrict" }),
  shopId: uuid("shop_id").references(() => shops.id, { onDelete: "restrict" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: createdAt(),
});

// ─── Catalogue (phase 2) ────────────────────────────────────────────────────

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);

/**
 * A sellable product. Commerce fields live here (the admin is the source of
 * truth); storefronts keep only presentation (images, colours) keyed by slug.
 * Money is integer minor units in the shop's settlement currency, tax-inclusive.
 */
export const products = pgTable(
  "products",
  {
    id: id(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    status: productStatus("status").notNull().default("draft"),
    priceMinor: integer("price_minor").notNull(),
    compareAtMinor: integer("compare_at_minor"),
    /** GST rate in basis points (1800 = 18%) and HSN code; confirm with a CA (§3.7). */
    taxRateBps: integer("tax_rate_bps").notNull().default(1800),
    hsnCode: text("hsn_code"),
    /** What the supplier charges, for gross profit; manual until Qikink exposes it. */
    costMinor: integer("cost_minor"),
    // Qikink fulfilment
    supplierSku: text("supplier_sku"),
    printTypeId: text("print_type_id"),
    designCode: text("design_code"),
    /** Key of the print file in this shop's private bucket */
    printFileKey: text("print_file_key"),
    printWidthIn: text("print_width_in"),
    printHeightIn: text("print_height_in"),
    mockupUrl: text("mockup_url"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_shop_slug_key").on(t.shopId, t.slug)],
);

// ─── Orders (phase 3) ───────────────────────────────────────────────────────

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

export type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  /** two-letter state code, e.g. MH */
  state: string;
  pin: string;
  country: "IN";
};

export const orders = pgTable(
  "orders",
  {
    id: id(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
    number: text("number").notNull(),
    status: orderStatus("status").notNull().default("pending_payment"),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    subtotalMinor: integer("subtotal_minor").notNull(),
    shippingMinor: integer("shipping_minor").notNull().default(0),
    discountMinor: integer("discount_minor").notNull().default(0),
    taxMinor: integer("tax_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(),
    /** intra = CGST+SGST, inter = IGST; null when the shop has no GSTIN */
    taxTreatment: text("tax_treatment"),
    /** payment gateway: PayU. Our txnid sent to PayU, and PayU's mihpayid once paid */
    paymentProvider: text("payment_provider").notNull().default("payu"),
    paymentTxnId: text("payment_txn_id"),
    paymentGatewayId: text("payment_gateway_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    // fulfilment (Qikink)
    supplierReference: text("supplier_reference"),
    supplierOrderId: text("supplier_order_id"),
    supplierStatus: text("supplier_status"),
    fulfilmentError: text("fulfilment_error"),
    awb: text("awb"),
    courier: text("courier"),
    trackingUrl: text("tracking_url"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_shop_number_key").on(t.shopId, t.number),
    uniqueIndex("orders_payment_txn_key").on(t.paymentTxnId),
    uniqueIndex("orders_payment_gateway_key").on(t.paymentGatewayId),
  ],
);

/** Lines snapshot title and price: editing a product never changes an order. */
export const orderItems = pgTable("order_items", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  costMinor: integer("cost_minor"),
  quantity: integer("quantity").notNull(),
});

/** Frozen at purchase; a later rate change never rewrites an invoice (§3.7). */
export const orderTaxLines = pgTable("order_tax_lines", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  /** cgst | sgst | igst */
  kind: text("kind").notNull(),
  rateBps: integer("rate_bps").notNull(),
  taxableMinor: integer("taxable_minor").notNull(),
  amountMinor: integer("amount_minor").notNull(),
});

/** Timeline shown on the order page: payment, fulfilment, sync, refunds. */
export const orderEvents = pgTable("order_events", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  data: jsonb("data"),
  createdAt: createdAt(),
});

export const refunds = pgTable("refunds", {
  id: id(),
  shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  /** the gateway's refund request id */
  gatewayRefundId: text("gateway_refund_id"),
  amountMinor: integer("amount_minor").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt(),
});

/** Unique (provider, external_id) makes webhook handling idempotent. */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: createdAt(),
  },
  (t) => [uniqueIndex("webhook_events_provider_external_key").on(t.provider, t.externalId)],
);

// ─── Integrations ───────────────────────────────────────────────────────────

/** Per-shop secrets (PayU, Qikink), AES-256-GCM encrypted; see src/lib/crypto.ts. */
export const shopCredentials = pgTable(
  "shop_credentials",
  {
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    encrypted: text("encrypted").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.shopId, t.provider] })],
);

/**
 * Storefront tokens. Looked up by hash before the shop is known, so this table
 * has no RLS policy; only the hash is stored and a token resolves to one shop.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("api_keys_hash_key").on(t.keyHash)],
);
