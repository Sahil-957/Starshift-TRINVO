/** Products, per shop. Every read and write runs inside withShop (RLS applies). */
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { withShop } from "../db/index.ts";
import { products } from "../db/schema.ts";

/** Rupees as typed in a form ("1,490.50") -> paise. */
const money = z
  .string()
  .trim()
  .transform((v) => v.replace(/[,₹\s]/g, ""))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter an amount like 1490 or 1490.50")
  .transform((v) => Math.round(Number(v) * 100));
const optionalMoney = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(money.nullable());
const optional = z
  .string()
  .trim()
  .max(500)
  .transform((v) => v || null);

export const productInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens"),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(4000),
  status: z.enum(["draft", "active", "archived"]),
  price: money,
  compareAt: optionalMoney,
  cost: optionalMoney,
  taxRatePercent: z.coerce.number().min(0).max(28).transform((v) => Math.round(v * 100)),
  hsnCode: optional,
  supplierSku: optional,
  printTypeId: optional,
  designCode: optional,
  printFileKey: optional,
  printWidthIn: optional,
  printHeightIn: optional,
  mockupUrl: optional,
});
export type ProductInput = z.input<typeof productInput>;

const toRow = (d: z.output<typeof productInput>) => ({
  name: d.name,
  slug: d.slug,
  tagline: d.tagline,
  description: d.description,
  status: d.status,
  priceMinor: d.price,
  compareAtMinor: d.compareAt,
  costMinor: d.cost,
  taxRateBps: d.taxRatePercent,
  hsnCode: d.hsnCode,
  supplierSku: d.supplierSku,
  printTypeId: d.printTypeId,
  designCode: d.designCode,
  printFileKey: d.printFileKey,
  printWidthIn: d.printWidthIn,
  printHeightIn: d.printHeightIn,
  mockupUrl: d.mockupUrl,
});

export const listProducts = (shopId: string) =>
  withShop(shopId, (tx) => tx.select().from(products).where(eq(products.shopId, shopId)).orderBy(asc(products.name)));

export const getProduct = async (shopId: string, productId: string) =>
  z.uuid().safeParse(productId).success
    ? (
        await withShop(shopId, (tx) =>
          tx
            .select()
            .from(products)
            .where(and(eq(products.shopId, shopId), eq(products.id, productId))),
        )
      )[0]
    : undefined;

export async function createProduct(shopId: string, input: ProductInput) {
  const row = toRow(productInput.parse(input));
  const [p] = await withShop(shopId, (tx) => tx.insert(products).values({ shopId, ...row }).returning());
  return p;
}

export async function updateProduct(shopId: string, productId: string, input: ProductInput) {
  const row = toRow(productInput.parse(input));
  const [p] = await withShop(shopId, (tx) =>
    tx
      .update(products)
      .set({ ...row, updatedAt: sql`now()` })
      .where(and(eq(products.shopId, shopId), eq(products.id, productId)))
      .returning(),
  );
  return p;
}

/** What a storefront may see: active products, commerce fields only. */
export const storefrontProducts = (shopId: string) =>
  withShop(shopId, (tx) =>
    tx
      .select({
        slug: products.slug,
        name: products.name,
        tagline: products.tagline,
        description: products.description,
        priceMinor: products.priceMinor,
        compareAtMinor: products.compareAtMinor,
      })
      .from(products)
      .where(and(eq(products.shopId, shopId), eq(products.status, "active")))
      .orderBy(asc(products.name)),
  );
