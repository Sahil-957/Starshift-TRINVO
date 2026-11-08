import { publishedReviews, submitReview } from "@/core/reviews";
import { storefront } from "../handler";

/** Published reviews for one product (?product=<slug>), or the latest across the shop */
export const GET = storefront(async (shopId, req) => publishedReviews(shopId, new URL(req.url).searchParams.get("product") || undefined));

/** A verified buyer's review; it waits for the shop to publish it. */
export const POST = storefront(async (shopId, req) => submitReview(shopId, await req.json()));
