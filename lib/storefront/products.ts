import { db } from "@/lib/db";
import { shoes, shoeInventory, shoeModels, shoeImages } from "@/lib/schema";
import { eq, gt, inArray, asc, sql } from "drizzle-orm";
import { resolveProductPrice, resolveCompareAtPrice } from "@/lib/helpers";

export type StorefrontProductSize = {
  inventoryId: string;
  size: string;
  quantity: number;
  resolvedPrice: number;
};

export type StorefrontProduct = {
  shoeId: string;
  modelId: string;
  modelName: string;
  color: string;
  price: number;
  compareAtPrice: number | null;
  /** Minimum resolved price across all in-stock sizes (used on catalog cards) */
  minPrice: number;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
  sizes: StorefrontProductSize[];
  /** MAX(shoeInventory.createdAt) as a YYYY-MM-DD string; drives the "Nouveautés" sort */
  newestAt: string;
};

export type StorefrontProductDetail = {
  shoeId: string;
  modelId: string;
  modelName: string;
  color: string;
  price: number;
  compareAtPrice: number | null;
  images: { url: string; altText: string | null }[];
  sizes: StorefrontProductSize[];
};

type Row = {
  inventoryId: string;
  shoeId: string;
  modelId: string;
  color: string;
  modelBasePrice: number;
  modelCompareAtPrice: number | null;
  shoePriceOverride: number | null;
  shoeCompareAtPriceOverride: number | null;
  sizePriceOverride: number | null;
  quantity: number;
  size: string;
  modelName: string;
  createdAt: string;
};

function baseSelect() {
  return db
    .select({
      inventoryId: shoeInventory.id,
      shoeId: shoes.id,
      modelId: shoes.modelId,
      color: shoes.color,
      modelBasePrice: shoeModels.basePrice,
      modelCompareAtPrice: shoeModels.compareAtPrice,
      shoePriceOverride: shoes.priceOverride,
      shoeCompareAtPriceOverride: shoes.compareAtPriceOverride,
      sizePriceOverride: shoeInventory.priceOverride,
      quantity: shoeInventory.quantity,
      size: shoeInventory.size,
      modelName: shoeModels.modelName,
      createdAt: shoeInventory.createdAt,
    })
    .from(shoes)
    .innerJoin(shoeInventory, eq(shoes.id, shoeInventory.shoeId))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id));
}

/** `size` is a free-text varchar — sort numerically when possible, else lexically. */
function numericSizeCompare(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

async function fetchImagesByShoeId(shoeIds: string[]) {
  const map = new Map<string, { url: string; altText: string | null }[]>();
  if (shoeIds.length === 0) return map;

  const images = await db
    .select({
      shoeId: shoeImages.shoeId,
      url: shoeImages.url,
      altText: shoeImages.altText,
    })
    .from(shoeImages)
    .where(inArray(shoeImages.shoeId, shoeIds))
    .orderBy(sql`${shoeImages.isPrimary} DESC`, asc(shoeImages.sortOrder));

  for (const img of images) {
    const list = map.get(img.shoeId) ?? [];
    list.push({ url: img.url, altText: img.altText });
    map.set(img.shoeId, list);
  }
  return map;
}

function groupRows(rows: Row[]): Map<string, StorefrontProduct> {
  const grouped = new Map<string, StorefrontProduct>();

  for (const row of rows) {
    const resolvedPrice = resolveProductPrice(
      row.modelBasePrice,
      row.shoePriceOverride,
      row.sizePriceOverride,
    );

    let product = grouped.get(row.shoeId);
    if (!product) {
      product = {
        shoeId: row.shoeId,
        modelId: row.modelId,
        modelName: row.modelName,
        color: row.color,
        price: resolveProductPrice(row.modelBasePrice, row.shoePriceOverride, null),
        compareAtPrice: resolveCompareAtPrice(row.modelCompareAtPrice, row.shoeCompareAtPriceOverride),
        minPrice: resolvedPrice,
        primaryImageUrl: null,
        primaryImageAlt: null,
        sizes: [],
        newestAt: row.createdAt,
      };
      grouped.set(row.shoeId, product);
    }

    product.sizes.push({
      inventoryId: row.inventoryId,
      size: row.size,
      quantity: row.quantity,
      resolvedPrice,
    });
    if (resolvedPrice < product.minPrice) product.minPrice = resolvedPrice;
    if (row.createdAt.localeCompare(product.newestAt) > 0) product.newestAt = row.createdAt;
  }

  for (const product of grouped.values()) {
    product.sizes.sort((a, b) => numericSizeCompare(a.size, b.size));
  }

  return grouped;
}

async function attachPrimaryImages(grouped: Map<string, StorefrontProduct>) {
  const imageMap = await fetchImagesByShoeId([...grouped.keys()]);
  for (const [shoeId, product] of grouped) {
    const imgs = imageMap.get(shoeId);
    if (imgs && imgs.length > 0) {
      product.primaryImageUrl = imgs[0].url;
      product.primaryImageAlt = imgs[0].altText;
    }
  }
}

/**
 * The catalog read path. In stock (quantity > 0) and priced by default;
 * `includeOutOfStock` / `includeUnpriced` are for the admin only (searching
 * the whole catalog to badge picks that wouldn't actually show up live).
 */
export async function getStorefrontProducts(opts?: {
  includeUnpriced?: boolean;
  includeOutOfStock?: boolean;
}): Promise<StorefrontProduct[]> {
  const includeOutOfStock = opts?.includeOutOfStock ?? false;
  const includeUnpriced = opts?.includeUnpriced ?? false;

  const rows = await baseSelect()
    .where(includeOutOfStock ? undefined : gt(shoeInventory.quantity, 0))
    .orderBy(asc(shoes.id), asc(shoeInventory.size));

  const grouped = groupRows(rows as Row[]);
  await attachPrimaryImages(grouped);

  let products = Array.from(grouped.values());
  if (!includeUnpriced) products = products.filter((p) => p.minPrice > 0);

  products.sort((a, b) => {
    const cmp = b.newestAt.localeCompare(a.newestAt);
    return cmp !== 0 ? cmp : a.shoeId.localeCompare(b.shoeId);
  });

  return products;
}

/** Fetches a specific set of products, preserving the order of `shoeIds`. */
export async function getStorefrontProductsByIds(shoeIds: string[]): Promise<StorefrontProduct[]> {
  if (shoeIds.length === 0) return [];

  const rows = await baseSelect()
    .where(inArray(shoes.id, shoeIds))
    .orderBy(asc(shoes.id), asc(shoeInventory.size));

  const grouped = groupRows(rows as Row[]);
  await attachPrimaryImages(grouped);

  return shoeIds
    .map((id) => grouped.get(id))
    .filter((p): p is StorefrontProduct => p !== undefined);
}

export async function getStorefrontProductDetail(
  shoeId: string,
): Promise<StorefrontProductDetail | null> {
  const rows = (await baseSelect()
    .where(eq(shoes.id, shoeId))
    .orderBy(asc(shoeInventory.size))) as Row[];

  if (rows.length === 0) return null;

  const first = rows[0];
  const images = (await fetchImagesByShoeId([shoeId])).get(shoeId) ?? [];

  const sizes = rows
    .map((row) => ({
      inventoryId: row.inventoryId,
      size: row.size,
      quantity: row.quantity,
      resolvedPrice: resolveProductPrice(row.modelBasePrice, row.shoePriceOverride, row.sizePriceOverride),
    }))
    .sort((a, b) => numericSizeCompare(a.size, b.size));

  return {
    shoeId: first.shoeId,
    modelId: first.modelId,
    modelName: first.modelName,
    color: first.color,
    price: resolveProductPrice(first.modelBasePrice, first.shoePriceOverride, null),
    compareAtPrice: resolveCompareAtPrice(first.modelCompareAtPrice, first.shoeCompareAtPriceOverride),
    images,
    sizes,
  };
}

export async function getStorefrontModels(): Promise<{ id: string; modelName: string }[]> {
  return db
    .select({ id: shoeModels.id, modelName: shoeModels.modelName })
    .from(shoeModels)
    .orderBy(asc(shoeModels.modelName));
}
