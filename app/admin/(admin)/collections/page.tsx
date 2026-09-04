import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { storefrontCollections, storefrontCollectionItems } from "@/lib/schema";
import CollectionsAdminClient from "./CollectionsAdminClient";
import type { CollectionSummary } from "./types";

export const dynamic = "force-dynamic";

export default async function CollectionsAdminPage() {
  const [collections, items] = await Promise.all([
    db.select().from(storefrontCollections).orderBy(asc(storefrontCollections.sortOrder)),
    db
      .select({ collectionId: storefrontCollectionItems.collectionId })
      .from(storefrontCollectionItems),
  ]);

  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.collectionId, (counts.get(item.collectionId) ?? 0) + 1);
  }

  const summaries: CollectionSummary[] = collections.map((collection) => ({
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    imageUrl: collection.imageUrl,
    imageAlt: collection.imageAlt,
    sortOrder: collection.sortOrder,
    isVisible: collection.isVisible,
    itemCount: counts.get(collection.id) ?? 0,
  }));

  return <CollectionsAdminClient collections={summaries} />;
}
