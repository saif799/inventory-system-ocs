/**
 * Shared between the Collections grid, the editor page and the server pages
 * that feed them. It lives outside both client components because the editor
 * moved onto its own route ([collectionId]/) and the two no longer import each
 * other.
 */

/** One colour variant, as the picker and the pick list show it. */
export type CatalogEntry = {
  shoeId: string;
  /**
   * Groups the picker's catalogue by Shoe Model. `null` only for a pick whose
   * product no longer resolves — the editor page synthesises an entry for it so
   * the pick is still removable, and such an entry never appears in the
   * catalogue panel.
   */
  modelId: string | null;
  modelName: string;
  color: string;
  primaryImageUrl: string | null;
  isLive: boolean;
};

/** A Collection with its resolved picks — what the editor page works on. */
export type CollectionWithItems = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  imageKey: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  sortOrder: number;
  isVisible: boolean;
  items: CatalogEntry[];
};

/**
 * What the grid needs. Deliberately only a count: the grid used to receive the
 * whole catalog so it could hydrate every pick, which meant loading the entire
 * product table to render a number.
 */
export type CollectionSummary = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  imageAlt: string | null;
  sortOrder: number;
  isVisible: boolean;
  itemCount: number;
};
