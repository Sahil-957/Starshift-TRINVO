-- Row-level security for the catalogue, orders and integrations (same policy as 0001).
-- api_keys is deliberately excluded: a storefront token is looked up by its hash
-- before the shop is known, and that lookup is what decides the shop.

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "products"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "orders"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "order_items"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "order_tax_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "order_tax_lines"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "order_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "order_events"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "refunds"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "webhook_events"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "shop_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "shop_credentials"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

-- history the application may add to but never rewrite
REVOKE UPDATE, DELETE, TRUNCATE ON "order_events" FROM "tinvo_app";--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "order_tax_lines" FROM "tinvo_app";--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "webhook_events" FROM "tinvo_app";
