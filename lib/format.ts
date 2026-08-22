/** Formatting helpers shared by the analytics server page and client charts. */

/** Categorical chart palette (matches the --chart-* CSS vars). Pure so it can be
 * imported by both server (color assignment) and client (chart) code. */
export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Compact number for chart axes: 1.2M, 540k, 320. */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

/** Algerian dinar amount, e.g. "5,243,550 DA". Admin/analytics (lang="en"). */
export function formatDA(value: number): string {
  return `${formatInt(value)} DA`;
}

/**
 * Same amount for the French storefront: "5 243 550 DA".
 *
 * Kept separate from formatDA rather than swapping the locale under it — the
 * admin dashboard is lang="en" and its analytics tables are built around
 * comma grouping. The storefront is fr-DZ, where comma grouping reads as a
 * decimal point to an Algerian shopper.
 */
export function formatDZD(value: number): string {
  return `${Math.round(value).toLocaleString("fr-DZ")} DA`;
}

/** 0..1 ratio -> "82%". */
export function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
