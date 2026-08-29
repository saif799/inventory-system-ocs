import Link from "next/link";
import ProductMedia from "./ProductMedia";
import { localePath, type Locale } from "@/i18n.config";
import type { CollectionWithProducts } from "@/lib/storefront/collections";

/**
 * The homepage tile for one Collection, and the only place a Collection's image
 * is ever rendered (ADR-0006) — there is no banner on the Collection page.
 *
 * DESIGN.md "Shapes": a square `object-cover` plate with hard corners, then the
 * text *below* it. Deliberately not an overlay card — no scrim, no border, no
 * shadow, nothing sitting on top of the photograph. It is the product card's
 * shape with a title where the price would be, which is what makes the grid
 * read as one system.
 *
 * A server component: unlike ProductCard it needs no translation, because a
 * Collection's title and subtitle are Catalog Data and render verbatim.
 */
export default function CollectionCard({
  collection,
  lng,
  priority = false,
}: {
  collection: CollectionWithProducts;
  lng: Locale;
  priority?: boolean;
}) {
  return (
    <Link
      href={localePath(lng, `/collection/${encodeURIComponent(collection.slug)}`)}
      className="group flex min-w-44 flex-col gap-4 py-2"
    >
      <ProductMedia
        imageUrl={collection.imageUrl}
        imageAlt={collection.imageAlt ?? collection.title}
        label={collection.title}
        sizes="(max-width: 768px) 50vw, 33vw"
        priority={priority}
        zoomOnHover
      />

      <div className="flex flex-col gap-1">
        <h3 className="sf-heading text-base font-medium leading-snug tracking-[-0.01em] text-wrap text-(--sf-text) md:text-xl">
          {collection.title}
        </h3>
        {collection.subtitle && (
          <p className="sf-body text-sm font-normal text-(--sf-muted)">{collection.subtitle}</p>
        )}
      </div>
    </Link>
  );
}
