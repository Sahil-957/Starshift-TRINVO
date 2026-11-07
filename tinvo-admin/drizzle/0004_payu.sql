ALTER TABLE "orders" ADD COLUMN "payment_provider" text DEFAULT 'razorpay' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_txn_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_gateway_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_txn_key" ON "orders" USING btree ("payment_txn_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_gateway_key" ON "orders" USING btree ("payment_gateway_id");