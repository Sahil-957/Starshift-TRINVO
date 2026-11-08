import type { MetadataRoute } from "next";
import { collections } from "@/data/collections";
import { products } from "@/data/products";
import { supportPages } from "@/data/support";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/shop",
    "/collections",
    "/about",
    "/contact",
    "/support",
    ...products.map((p) => `/shop/${p.slug}`),
    ...collections.map((c) => `/collections/${c.slug}`),
    ...supportPages.map((s) => `/support/${s.slug}`),
  ];
  return paths.map((p) => ({ url: SITE + p }));
}
