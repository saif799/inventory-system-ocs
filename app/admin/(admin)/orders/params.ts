/**
 * The URL contract for this page, shared by the server component that reads it
 * and the client tables that write it. Both tabs share one unprefixed param
 * set; switching tabs clears it rather than remembering per-tab filters.
 */

/** Rows per page. Small on purpose — past the first screen you search, not page. */
export const PAGE_SIZE = 15;

export type Tab = "online" | "store";

/** Sentinel for "don't filter by status" — the only status value that isn't an id. */
export const ALL_STATUSES = "all";

/**
 * Sortable columns. `reference` is deliberately absent: it's a courier tracking
 * string, so ordering by it means nothing. `montant` is a varchar in the schema
 * and needs a numeric cast to sort correctly.
 */
export type OrderSortField = "createdAt" | "montant";
export type SortDirection = "asc" | "desc";
export type OrderSort = { field: OrderSortField; direction: SortDirection };

export const DEFAULT_ORDER_SORT: OrderSort = {
  field: "createdAt",
  direction: "desc",
};

/** `?sort=montant.asc` -> {field, direction}, falling back to the default. */
export function parseOrderSort(raw: string | undefined): OrderSort {
  if (!raw) return DEFAULT_ORDER_SORT;
  const [field, direction] = raw.split(".");
  if (field !== "createdAt" && field !== "montant") return DEFAULT_ORDER_SORT;
  return {
    field,
    direction: direction === "asc" ? "asc" : "desc",
  };
}

export function serializeOrderSort(sort: OrderSort): string {
  return `${sort.field}.${sort.direction}`;
}

export type DateMode = "all" | "today" | "custom";

export function parseDateMode(raw: string | undefined): DateMode {
  return raw === "today" || raw === "custom" ? raw : "all";
}

/** 1-based, clamped to >= 1. Page 1 is never written to the URL. */
export function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}
