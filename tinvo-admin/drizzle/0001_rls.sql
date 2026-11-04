-- Row-level security: the database's own shop isolation (proposal §2.4, layer 3).
-- Applies to tinvo_app (no BYPASSRLS). The owner role that runs migrations bypasses it.
-- The policy reads a transaction-local setting written by withShop() in src/db/index.ts.
-- No setting, or one left blank by an earlier pooled transaction, matches nothing.

ALTER TABLE "shop_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "shop_settings"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint

-- audit trail is append-only for the application
REVOKE UPDATE, DELETE, TRUNCATE ON "audit_logs" FROM "tinvo_app";
