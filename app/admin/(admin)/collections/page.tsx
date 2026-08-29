import { db } from "@/lib/db";
import { storefrontCollections, storefrontCollectionItems } from "@/lib/schema";
import { asc } from "drizzle-orm";
import { getStorefrontProducts, isLive } from "@/lib/storefront/products";
import CollectionsAdminClient, {
  type CatalogEntry,
  type CollectionWithItems,
} from "./CollectionsAdminClient";

export const dynamic = "force-dynamic";

export default async function CollectionsAdminPage() {
  const [collections, items, catalog] = await Promise.all([
    db.select().from(storefrontCollections).orderBy(asc(storefrontCollections.sortOrder)),
    db.select().from(storefrontCollectionItems).orderBy(asc(storefrontCollectionItems.sortOrder)),
    // The whole catalog, unpriced and sold-out included: the picker has to be
    // able to show a variant in order to badge it as one that would not render.
    getStorefrontProducts({ includeUnpriced: true, includeOutOfStock: true }),
  ]);

  const catalogById = new Map(catalog.map((p) => [p.shoeId, p]));
  const live = (shoeId: string) => {
    const product = catalogById.get(shoeId);
    return !!product && isLive(product);
  };

  const collectionsWithItems: CollectionWithItems[] = collections.map((collection) => ({
    id: collection.id,
    title: collection.title,
    subtitle: collection.subtitle,
    slug: collection.slug,
    imageKey: collection.imageKey,
    imageUrl: collection.imageUrl,
    imageAlt: collection.imageAlt,
    sortOrder: collection.sortOrder,
    isVisible: collection.isVisible,
    items: items
      .filter((item) => item.collectionId === collection.id)
      .map((item) => {
        const product = catalogById.get(item.shoeId);
        return {
          shoeId: item.shoeId,
          modelName: product?.modelName ?? "Produit introuvable",
          color: product?.color ?? "",
          primaryImageUrl: product?.primaryImageUrl ?? null,
          isLive: live(item.shoeId),
        };
      }),
  }));

  const catalogForPicker: CatalogEntry[] = catalog.map((product) => ({
    shoeId: product.shoeId,
    modelName: product.modelName,
    color: product.color,
    primaryImageUrl: product.primaryImageUrl,
    isLive: isLive(product),
  }));

  return (
    <CollectionsAdminClient collections={collectionsWithItems} catalog={catalogForPicker} />
  );
}
