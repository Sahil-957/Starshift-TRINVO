DROP INDEX "orders_razorpay_order_key";--> statement-breakpoint
DROP INDEX "orders_razorpay_payment_key";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_provider" SET DEFAULT 'payu';--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "razorpay_order_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "razorpay_payment_id";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "razorpay_refund_id";