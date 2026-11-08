CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_shop_email_key" ON "subscribers" USING btree ("shop_id","email");--> statement-breakpoint
ALTER TABLE "subscribers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shop_isolation" ON "subscribers"
  USING ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
  WITH CHECK ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
