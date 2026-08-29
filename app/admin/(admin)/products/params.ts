/**
 * The URL contract for /admin/products, shared by the filter bar that writes it
 * and the list that reads it. Mirrors orders/params.ts, including its rule that
 * defaults are never written to the URL — a bare /admin/products is canonical.
 *
 *   ?q=<text>  ?price=priced|unpriced  ?images=with|without
 *   ?stock=all|out      (absent => "in", the default)
 *   ?archived=1         (absent => the active scope)
 */

import type { ModelRow } from "./types";

/** Three-state controls. "all" is the default for price and images. */
export type PriceFilter = "all" | "priced" | "unpriced";
export type ImagesFilter = "all" | "with" | "without";

/**
 * Stock defaults to "in" — the page is a working list, not an archive. This is
 * Physical Quantity (the sum over `shoeInventory.quantity`), not Store-Held
 * Stock: what is sellable, not what is on the owner's shelf. See CONTEXT.md.
 */
export type StockFilter = "all" | "in" | "out";

/**
 * A two-state scope applied *before* the other three, not a fourth filter:
 * "active" hides archived models entirely and archived variants of live models,
 * "archived" shows archived models with all their variants plus live models'
 * archived variants.
 */
export type ArchivedScope = "active" | "archived";

export type ProductFilters = {
  q: string;
  price: PriceFilter;
  images: ImagesFilter;
  stock: StockFilter;
  archived: ArchivedScope;
};

export const DEFAULT_FILTERS: ProductFilters = {
  q: "",
  price: "all",
  images: "all",
  stock: "in",
  archived: "active",
};

export function parsePrice(raw: string | null | undefined): PriceFilter {
  return raw === "priced" || raw === "unpriced" ? raw : "all";
}

export function parseImages(raw: string | null | undefined): ImagesFilter {
  return raw === "with" || raw === "without" ? raw : "all";
}

export function parseStock(raw: string | null | undefined): StockFilter {
  return raw === "all" || raw === "out" ? raw : "in";
}

export function parseArchived(raw: string | null | undefined): ArchivedScope {
  return raw === "1" ? "archived" : "active";
}

export function parseFilters(params: URLSearchParams): ProductFilters {
  return {
    q: params.get("q") ?? "",
    price: parsePrice(params.get("price")),
    images: parseImages(params.get("images")),
    stock: parseStock(params.get("stock")),
    archived: parseArchived(params.get("archived")),
  };
}

/** Every param this page owns — the set `clearFilters` has to wipe. */
export const FILTER_KEYS = ["q", "price", "images", "stock", "archived"] as const;

/**
 * The write half of the contract, kept next to the parsers so the encoding and
 * the "defaults are never written to the URL" rule live in one file. Returns
 * the `null`-means-delete shape `useUrlParams().setParams` takes, and only for
 * the keys the patch actually mentions.
 */
export function serializeFilters(
  patch: Partial<ProductFilters>,
): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  for (const key of FILTER_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    updates[key] =
      key === "archived"
        ? value === "archived"
          ? "1"
          : null
        : value === DEFAULT_FILTERS[key] || !value
          ? null
          : value;
  }
  return updates;
}

/** Wipes every param this page owns, restoring the canonical bare URL. */
export function clearedFilters(): Record<string, null> {
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, null]));
}

/**
 * Drives both the auto-expand of model cards and the "Clear filters" button, so
 * it has to be the one definition of "the user has narrowed this list".
 */
export function isFiltered(filters: ProductFilters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.price !== DEFAULT_FILTERS.price ||
    filters.images !== DEFAULT_FILTERS.images ||
    filters.stock !== DEFAULT_FILTERS.stock ||
    filters.archived !== DEFAULT_FILTERS.archived
  );
}

/**
 * Applies the whole contract in one pass: archived scope first, then the model
 * name search, then price/images/stock ANDed over the surviving variants. A
 * model survives if at least one of its variants does, so filtering to
 * "unpriced" yields exactly the fix-list.
 *
 * Client-side on purpose — the page already loads every row (73 models / ~350
 * variants), so there is nothing to gain from a round trip.
 */
export function filterModels(models: ModelRow[], filters: ProductFilters): ModelRow[] {
  const needle = filters.q.trim().toLowerCase();

  const out: ModelRow[] = [];
  for (const model of models) {
    // Archived rows are retired on purpose — they should stop nagging, so the
    // scope is applied before anything else.
    if (filters.archived === "active" && model.archived) continue;
    const inScope =
      filters.archived === "active"
        ? model.variants.filter((v) => !v.archived)
        : // An archived model is shown whole; a live one contributes only the
          // variants that were archived individually.
          model.archived
          ? model.variants
          : model.variants.filter((v) => v.archived);

    if (needle && !model.modelName.toLowerCase().includes(needle)) continue;

    const variants = inScope.filter((v) => {
      if (filters.price === "priced" && !v.hasPrice) return false;
      if (filters.price === "unpriced" && v.hasPrice) return false;
      if (filters.images === "with" && v.imageCount === 0) return false;
      if (filters.images === "without" && v.imageCount > 0) return false;
      if (filters.stock === "in" && v.totalStock <= 0) return false;
      if (filters.stock === "out" && v.totalStock > 0) return false;
      return true;
    });

    if (variants.length === 0) continue;
    out.push({ ...model, variants });
  }
  return out;
}

/** The row count both the "N of M" label and its denominator are built from. */
export function countVariants(models: ModelRow[]): number {
  return models.reduce((sum, m) => sum + m.variants.length, 0);
}
