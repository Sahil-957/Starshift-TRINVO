/**
 * Verified-buyer reviews. A review needs the order number and email of a paid
 * order containing the product; it waits as "pending" until someone in the shop
 * publishes it. Only published reviews ever reach a storefront.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, withShop } from "../db/index.ts";
import { orderItems, orders, products, reviews, shops } from "../db/schema.ts";
import { sendMail } from "../lib/mail.ts";
import { ownerAlert } from "./email-templates.ts";
import { CheckoutError } from "./orders.ts";

/** Orders that were actually paid for (and not refunded) can be reviewed. */
const REVIEWABLE = ["paid", "in_production", "shipped", "delivered"] as const;

export const reviewInput = z.object({
  slug: z.string().trim().min(1).max(80),
  number: z.string().trim().min(1, "Enter your order number.").max(40),
  email: z.string().trim().max(200).pipe(z.email("Enter the email you ordered with.")),
  name: z.string().trim().min(1, "Enter your name.").max(60),
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  title: z.string().trim().max(80).default(""),
  body: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(2000),
});

/** "Priya Sharma" → "Priya S." */
export const publicName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

export async function submitReview(shopId: string, raw: z.input<typeof reviewInput>) {
  const input = reviewInput.parse(raw);
  const id = await withShop(shopId, async (tx) => {
    const [match] = await tx
      .select({ orderId: orders.id, productId: products.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(products, and(eq(products.id, orderItems.productId), eq(products.slug, input.slug)))
      .where(
        and(
          eq(orders.shopId, shopId),
          eq(orders.number, input.number.toUpperCase()),
          eq(sql`lower(${orders.email})`, input.email.toLowerCase()),
          inArray(orders.status, [...REVIEWABLE]),
        ),
      )
      .limit(1);
    if (!match) throw new CheckoutError("We couldn't find a paid order with that number and email that includes this design.");
    const [row] = await tx
      .insert(reviews)
      .values({
        shopId,
        productId: match.productId,
        orderId: match.orderId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        authorName: publicName(input.name),
      })
      .onConflictDoNothing()
      .returning({ id: reviews.id });
    if (!row) throw new CheckoutError("You've already reviewed this design for that order. Thank you!");
    return row.id;
  });
  await alertOwner(shopId, input).catch((e) => console.error("email (review) failed:", (e as Error).message));
  return { id };
}

async function alertOwner(shopId: string, r: z.output<typeof reviewInput>) {
  const to = process.env.ALERT_EMAIL || process.env.SMTP_USER;
  if (!to) return;
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  const url = process.env.ADMIN_URL ? `${process.env.ADMIN_URL.replace(/\/$/, "")}/s/${shopId}/reviews` : null;
  const e = ownerAlert({
    shop: shop.name,
    title: `New ${r.rating}★ review waiting for approval`,
    detail: `${r.title ? `“${r.title}” — ` : ""}${r.body.slice(0, 300)}\n\n${publicName(r.name)} · ${r.slug} · order ${r.number.toUpperCase()}`,
    what: "It won't show on the website until you publish it in Reviews.",
    adminUrl: url,
  });
  await sendMail({ to, subject: e.subject, text: e.text, html: e.html, fromName: `${shop.name} alerts` });
}

/** What a storefront shows: published reviews for one product (or the latest across the shop) and their average. */
export const publishedReviews = (shopId: string, slug?: string) =>
  withShop(shopId, async (tx) => {
    const where = and(eq(reviews.shopId, shopId), slug ? eq(products.slug, slug) : undefined, eq(reviews.status, "published"));
    const list = await tx
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        author: reviews.authorName,
        date: reviews.publishedAt,
        product: products.name,
        slug: products.slug,
      })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(where)
      .orderBy(desc(reviews.publishedAt))
      .limit(slug ? 100 : 9);
    const [stats] = await tx
      .select({ count: sql<number>`count(*)::int`, average: sql<number | null>`round(avg(${reviews.rating}), 1)::float` })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(where);
    const breakdown = await tx
      .select({ rating: reviews.rating, n: sql<number>`count(*)::int` })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(where)
      .groupBy(reviews.rating);
    return { ...stats, breakdown: Object.fromEntries(breakdown.map((b) => [b.rating, b.n])) as Record<number, number>, reviews: list };
  });

// ─── admin ──────────────────────────────────────────────────────────────────

export const listReviews = (shopId: string, status?: "pending" | "published" | "hidden") =>
  withShop(shopId, (tx) =>
    tx
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        author: reviews.authorName,
        status: reviews.status,
        createdAt: reviews.createdAt,
        product: products.name,
        orderId: orders.id,
        orderNumber: orders.number,
      })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .innerJoin(orders, eq(orders.id, reviews.orderId))
      .where(and(eq(reviews.shopId, shopId), status ? eq(reviews.status, status) : undefined))
      .orderBy(desc(reviews.createdAt))
      .limit(300),
  );

export const pendingReviewCount = (shopId: string) =>
  withShop(shopId, async (tx) => {
    const [r] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(reviews)
      .where(and(eq(reviews.shopId, shopId), eq(reviews.status, "pending")));
    return r.n;
  });

export const setReviewStatus = (shopId: string, reviewId: string, status: "published" | "hidden") =>
  withShop(shopId, (tx) =>
    tx
      .update(reviews)
      .set({ status, publishedAt: status === "published" ? sql`coalesce(${reviews.publishedAt}, now())` : reviews.publishedAt })
      .where(and(eq(reviews.shopId, shopId), eq(reviews.id, reviewId))),
  );
