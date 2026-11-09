CREATE TYPE "public"."customer_token_kind" AS ENUM('session', 'verify', 'reset');--> statement-breakpoint
CREATE TABLE "customer_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"kind" "customer_token_kind" NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_tokens" ADD CONSTRAINT "customer_tokens_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tokens" ADD CONSTRAINT "customer_tokens_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_tokens_hash_key" ON "customer_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "customer_tokens_customer_idx" ON "customer_tokens" USING btree ("customer_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_shop_email_key" ON "customers" USING btree ("shop_id","email");--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "customers"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "customer_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "customer_tokens"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);