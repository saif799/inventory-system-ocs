import { db } from "@/lib/db";
import { storefrontSections, storefrontSectionItems } from "@/lib/schema";
import { asc } from "drizzle-orm";
import { getStorefrontProducts } from "@/lib/storefront/products";
import StorefrontAdminClient, {
  type CatalogEntry,
  type SectionWithItems,
} from "./StorefrontAdminClient";

export const dynamic = "force-dynamic";

export default async function StorefrontAdminPage() {
  const [sections, items, catalog] = await Promise.all([
    db.select().from(storefrontSections).orderBy(asc(storefrontSections.sortOrder)),
    db.select().from(storefrontSectionItems).orderBy(asc(storefrontSectionItems.sortOrder)),
    getStorefrontProducts({ includeUnpriced: true, includeOutOfStock: true }),
  ]);

  const catalogById = new Map(catalog.map((p) => [p.shoeId, p]));
  const isLive = (shoeId: string) => {
    const p = catalogById.get(shoeId);
    return !!p && p.minPrice > 0 && p.sizes.some((s) => s.quantity > 0);
  };

  const sectionsWithItems: SectionWithItems[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    ctaHref: s.ctaHref,
    sortOrder: s.sortOrder,
    isVisible: s.isVisible,
    items: items
      .filter((i) => i.sectionId === s.id)
      .map((i) => {
        const product = catalogById.get(i.shoeId);
        return {
          shoeId: i.shoeId,
          modelName: product?.modelName ?? "Produit introuvable",
          color: product?.color ?? "",
          primaryImageUrl: product?.primaryImageUrl ?? null,
          isLive: isLive(i.shoeId),
        };
      }),
  }));

  const catalogForPicker: CatalogEntry[] = catalog.map((p) => ({
    shoeId: p.shoeId,
    modelName: p.modelName,
    color: p.color,
    primaryImageUrl: p.primaryImageUrl,
    isLive: isLive(p.shoeId),
  }));

  return <StorefrontAdminClient sections={sectionsWithItems} catalog={catalogForPicker} />;
}
