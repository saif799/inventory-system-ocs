import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
} from "@/i18n.config";

/**
 * Locale routing for the storefront. Replaces the old middleware.ts, which
 * only tagged storefront requests with `x-ocs-storefront` so the root layout
 * could pick a `lang` — that job is now done properly by the locale segment.
 *
 * Every storefront URL carries its locale: /ar/... and /fr/.... A path with no
 * locale is redirected to one, and which one depends on *why* the path has no
 * locale:
 *
 *   "/"          the front door. Arabic is the default language, so it goes to
 *                /ar — unless the visitor explicitly picked a language before,
 *                in which case the cookie wins. TEMPORARY redirect (307): the
 *                destination varies per visitor, and a permanent one would be
 *                cached by the browser and freeze the first choice forever.
 *
 *   "/product/x" a legacy link. Every bare deep path predates this change, so
 *                it was a *French* URL — an old ad, a shared link, a crawled
 *                result. Those go to /fr, not /ar, because French is what the
 *                link promised. PERMANENT redirect (308) so the SEO signal
 *                transfers.
 *
 * We deliberately do NOT sniff Accept-Language. Algerian browsers overwhelmingly
 * report fr-FR or en-US, so detection would fight the Arabic default and send
 * Arabic-preferring visitors to French. The cookie is written only by the
 * language switcher, so it is the one signal that reflects an actual choice.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  // Already localised: hand the locale to Server Components via a header so
  // getT() and the root layout can read it without prop-drilling.
  if (isLocale(maybeLocale)) {
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, maybeLocale);
    return NextResponse.next({ request: { headers } });
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const isRoot = pathname === "/";

  const target = isRoot
    ? isLocale(cookieLocale)
      ? cookieLocale
      : DEFAULT_LOCALE
    : "fr";

  const destination = new URL(
    `/${target}${isRoot ? "" : pathname}${search}`,
    request.url,
  );

  return NextResponse.redirect(destination, isRoot ? 307 : 308);
}

export const config = {
  /**
   * Storefront only. /admin and /api keep their unprefixed URLs, and the
   * negative lookahead also spares Next's internals and the SEO files served
   * from the app root (sitemap.xml / robots.txt would otherwise be redirected
   * to /fr/sitemap.xml and 404).
   */
  matcher: [
    "/((?!admin|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};
