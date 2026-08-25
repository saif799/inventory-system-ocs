import "server-only";
import { headers } from "next/headers";
import {
  getResources,
  getT as baseGetT,
  initServerI18next,
} from "next-i18next/server";
import type { FlatNamespace } from "i18next";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from "@/i18n.config";
import { serverI18nConfig } from "./serverConfig";

/**
 * The one place the server i18next instance is set up. Importing this module
 * is what registers the config, so every server-side translation entry point
 * goes through here rather than calling next-i18next directly.
 *
 * The underlying instance is a module-level singleton that preloads every
 * language and stays language-neutral — per-request locale comes from
 * getFixedT(lng), never changeLanguage(), so concurrent requests in different
 * locales cannot bleed into each other.
 */
initServerI18next(serverI18nConfig);

export { getResources };

/**
 * Translations for a Server Component.
 *
 * `lng` is passed explicitly rather than detected, because every storefront
 * page already has it from its [lng] route param — that is the authoritative
 * value, and relying on header detection instead would silently fall back to
 * the wrong locale anywhere the proxy matcher does not run.
 */
export async function getT<Ns extends FlatNamespace = FlatNamespace>(
  lng: string,
  ns?: Ns | Ns[],
) {
  return baseGetT(ns, { lng });
}

/**
 * The active locale for code that has no [lng] param to read — currently just
 * the root layout, which sits above the locale segment and still has to put
 * `lang`/`dir` on <html>. Falls back to the default rather than throwing so a
 * non-storefront route (/admin) does not blow up.
 */
export async function getRequestLocale(): Promise<Locale> {
  const headerList = await headers();
  const fromProxy = headerList.get(LOCALE_HEADER);
  return isLocale(fromProxy) ? fromProxy : DEFAULT_LOCALE;
}

/** True for /admin and anything else the locale proxy does not tag. */
export async function isStorefrontRequest(): Promise<boolean> {
  const headerList = await headers();
  return isLocale(headerList.get(LOCALE_HEADER));
}
