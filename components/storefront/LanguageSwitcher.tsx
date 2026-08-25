"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/app/i18n/client";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n.config";

/**
 * AR | FR toggle. Two locales do not warrant a dropdown.
 *
 * It swaps only the first path segment and carries the query string through,
 * so switching from /ar/products?ProductName=jordan lands on
 * /fr/products?ProductName=jordan rather than dumping the visitor on the
 * homepage — the spike's one-way "Version française" link did the latter.
 *
 * Clicking is also the only thing that ever writes the locale cookie: proxy.ts
 * reads it at "/" to honour a returning visitor's choice, and a cookie written
 * by anything other than a deliberate click would not represent a choice.
 */
export default function LanguageSwitcher({
  className,
}: {
  className?: string;
}) {
  const active = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useT("common");

  const hrefFor = (locale: Locale) => {
    const segments = pathname.split("/");
    // segments[0] is "" and segments[1] is the current locale.
    segments[1] = locale;
    const query = searchParams.toString();
    return `${segments.join("/") || `/${locale}`}${query ? `?${query}` : ""}`;
  };

  const persist = (locale: Locale) => {
    // Session-independent and readable by the Edge proxy, so it survives a
    // full reload and a return visit.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label={t("language.label")}
    >
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-(--sf-line)">
              |
            </span>
          )}
          <Link
            href={hrefFor(locale)}
            hrefLang={locale}
            onClick={() => persist(locale)}
            aria-current={locale === active ? "true" : undefined}
            title={t("language.switchTo", { language: t(`language.${locale}`) })}
            className={cn(
              "sf-body px-1 py-2 text-xs uppercase tracking-[0.12em] transition-colors",
              locale === active
                ? "font-medium text-(--sf-text)"
                : "font-normal text-(--sf-muted) hover:text-(--sf-text)",
            )}
          >
            {locale}
          </Link>
        </span>
      ))}
    </div>
  );
}
