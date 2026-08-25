import type { I18nConfig } from "next-i18next/proxy";

/**
 * Shared locale facts. Imported by `proxy.ts`, which runs on the Edge runtime —
 * so this file must stay free of Node built-ins. The `resourceLoader` (which
 * reaches for `fs` in dev) lives in app/i18n/serverConfig.ts instead.
 *
 * Two different "defaults" live here and they are deliberately NOT the same
 * value:
 *
 *   DEFAULT_LOCALE ("ar") is the *routing* default — what a visitor gets at `/`.
 *   fallbackLng    ("fr") is the *translation* default — what renders when an
 *                  Arabic key has not been written yet.
 *
 * Arabic is the language we lead with; French is the language we fall back to
 * because it is the one catalog guaranteed to be complete. Collapsing the two
 * into one value would either send every visitor to French or make untranslated
 * Arabic keys render as raw key names.
 */

/** Routing default: `/` resolves here unless the visitor picked otherwise. */
export const DEFAULT_LOCALE = "ar";

export const LOCALES = ["ar", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

/** Written only by the language switcher, never by locale sniffing. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** The header proxy.ts sets so Server Components can read the active locale. */
export const LOCALE_HEADER = "x-i18next-current-language";

export const NAMESPACES = [
  "common",
  "home",
  "catalog",
  "product",
  "checkout",
  "faq",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Prefixes an app-relative path with its locale: ("ar", "/products") →
 * "/ar/products". Every storefront <Link> and canonical goes through this —
 * a bare "/products" would be caught by proxy.ts and redirected to French,
 * which on an Arabic page is a bug that only shows up as a mysterious extra
 * hop rather than a broken link.
 */
export function localePath(lng: Locale, path = "/"): string {
  if (!path || path === "/") return `/${lng}`;
  return `/${lng}${path.startsWith("/") ? path : `/${path}`}`;
}

/** BCP-47 tags for `<html lang>`, hreflang and OpenGraph. */
export const LOCALE_TAGS: Record<Locale, string> = {
  ar: "ar-DZ",
  fr: "fr-DZ",
};

/**
 * The FAQ entries every locale's faq.json must define, in display order.
 *
 * It lives here rather than beside the FAQ renderer because it is a contract
 * *between* the catalogs — the thing tests/i18n.test.ts checks both files
 * against — and the renderer is server-only.
 */
export const FAQ_IDS = [
  "deliveryTime",
  "coverage",
  "cashOnDelivery",
  "authenticity",
  "exchange",
  "location",
] as const;

export const baseI18nConfig: I18nConfig = {
  supportedLngs: [...LOCALES],
  fallbackLng: "fr",
  defaultNS: "common",
  ns: [...NAMESPACES],
  cookieName: LOCALE_COOKIE,
  headerName: LOCALE_HEADER,
};

export default baseI18nConfig;
