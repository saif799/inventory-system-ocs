import { db } from "@/lib/db";
import { storefrontSections, storefrontSectionItems } from "@/lib/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { getStorefrontProductsByIds, type StorefrontProduct } from "./products";

export type StorefrontSectionWithProducts = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaHref: string | null;
  products: StorefrontProduct[];
};

/** A product only counts as "live" on the homepage if it's priced and has stock. */
function isLive(product: StorefrontProduct) {
  return product.minPrice > 0 && product.sizes.some((s) => s.quantity > 0);
}

/**
 * Visible sections with their picks resolved to live products, in curated
 * order. Sold-out or unpriced picks are silently dropped here (the admin
 * picker is what surfaces them as a warning).
 */
export async function getVisibleSections(): Promise<StorefrontSectionWithProducts[]> {
  const sections = await db
    .select()
    .from(storefrontSections)
    .where(eq(storefrontSections.isVisible, true))
    .orderBy(asc(storefrontSections.sortOrder));

  if (sections.length === 0) return [];

  const items = await db
    .select()
    .from(storefrontSectionItems)
    .where(
      inArray(
        storefrontSectionItems.sectionId,
        sections.map((s) => s.id),
      ),
    )
    .orderBy(asc(storefrontSectionItems.sortOrder));

  const allShoeIds = [...new Set(items.map((i) => i.shoeId))];
  const products = await getStorefrontProductsByIds(allShoeIds);
  const productByShoeId = new Map(products.map((p) => [p.shoeId, p]));

  return sections.map((section) => {
    const sectionProducts = items
      .filter((i) => i.sectionId === section.id)
      .map((i) => productByShoeId.get(i.shoeId))
      .filter((p): p is StorefrontProduct => p !== undefined && isLive(p));

    return {
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      ctaHref: section.ctaHref,
      products: sectionProducts,
    };
  });
}
