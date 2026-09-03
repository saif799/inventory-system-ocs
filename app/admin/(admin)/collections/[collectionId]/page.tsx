import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { storefrontCollections, storefrontCollectionItems } from "@/lib/schema";
import { getStorefrontProducts, isLive } from "@/lib/storefront/products";
import CollectionEditorClient from "./CollectionEditorClient";
import type { CatalogEntry, CollectionWithItems } from "../types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CollectionEditPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  // Postgres raises on a malformed uuid, which would surface as a 500 rather
  // than the 404 a bad URL deserves.
  if (!UUID.test(collectionId)) notFound();

  const [row] = await db
    .select()
    .from(storefrontCollections)
    .where(eq(storefrontCollections.id, collectionId));
  if (!row) notFound();

  const [items, catalog] = await Promise.all([
    db
      .select()
      .from(storefrontCollectionItems)
      .where(eq(storefrontCollectionItems.collectionId, collectionId))
      .orderBy(asc(storefrontCollectionItems.sortOrder)),
    // The whole catalog, unpriced and sold-out included: the picker has to be
    // able to show a variant in order to badge it as one that would not render.
    getStorefrontProducts({ includeUnpriced: true, includeOutOfStock: true }),
  ]);

  const catalogById = new Map(catalog.map((p) => [p.shoeId, p]));

  const collection: CollectionWithItems = {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    slug: row.slug,
    imageKey: row.imageKey,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    sortOrder: row.sortOrder,
    isVisible: row.isVisible,
    items: items.map((item) => {
      const product = catalogById.get(item.shoeId);
      return {
        shoeId: item.shoeId,
        modelId: product?.modelId ?? null,
        modelName: product?.modelName ?? "Product not found",
        color: product?.color ?? "",
        primaryImageUrl: product?.primaryImageUrl ?? null,
        isLive: !!product && isLive(product),
      };
    }),
  };

  const catalogForPicker: CatalogEntry[] = catalog.map((product) => ({
    shoeId: product.shoeId,
    modelId: product.modelId,
    modelName: product.modelName,
    color: product.color,
    primaryImageUrl: product.primaryImageUrl,
    isLive: isLive(product),
  }));

  return <CollectionEditorClient collection={collection} catalog={catalogForPicker} />;
}
