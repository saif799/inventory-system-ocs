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

/**
 * Maps Arabic-Indic (٠١٢…) and Extended Arabic-Indic (۰۱۲…) digits onto ASCII.
 *
 * The storefront *displays* Latin digits in both locales — that is what
 * Algerian commerce uses — but an Arabic keyboard can still emit Arabic-Indic
 * ones. PHONE_REGEX is ASCII-only, so without this an Arabic-first shopper
 * typing their own phone number is rejected by a validation message that
 * itself shows Latin digits, on the one form that matters most. Normalise
 * before validating, never reject.
 */
export function normalizeDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}
