"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useT, Trans } from "next-i18next/client";
import {
  DEFAULT_LOCALE,
  isLocale,
  localePath,
  type Locale,
} from "@/i18n.config";

export { useT, Trans };

/**
 * The active locale inside a Client Component, read from the [lng] route
 * segment — the same source useT() syncs against, so the two can never
 * disagree.
 */
export function useLocale(): Locale {
  const params = useParams();
  const raw = params?.lng;
  const lng = Array.isArray(raw) ? raw[0] : raw;
  return isLocale(lng) ? lng : DEFAULT_LOCALE;
}

/**
 * Builds locale-prefixed hrefs. Client components link with this instead of a
 * bare path, because a bare "/products" is caught by proxy.ts and redirected —
 * on an Arabic page that silently bounces the visitor into French.
 */
export function useLocalePath(): (path?: string) => string {
  const lng = useLocale();
  return useCallback((path = "/") => localePath(lng, path), [lng]);
}
