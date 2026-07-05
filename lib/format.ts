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

/** Algerian dinar amount, e.g. "5,243,550 DA". */
export function formatDA(value: number): string {
  return `${formatInt(value)} DA`;
}

/** 0..1 ratio -> "82%". */
export function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
