import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
} from "@/i18n.config";
import {
  SESSION_COOKIE,
  isCronRequest,
  verifySessionToken,
} from "@/lib/auth/session";
import {
  isAdminPath,
  isApiPath,
  isCronSharedPath,
  isLoginPath,
  isPublicApiRequest,
} from "@/lib/auth/protected";

/**
 * Two jobs, in strict order: gate the admin surface, then route storefront
 * locales. They share this file because Next gives an app exactly one proxy.
 *
 * ── Auth ──────────────────────────────────────────────────────────────────
 * /admin and /api are the *only* paths the auth half looks at, and the locale
 * half must never see them: an unguarded fall-through would redirect /admin to
 * /fr/admin and 404 the whole dashboard. Hence the early return.
 *
 * Note this file's matcher used to exclude `admin|api` outright, so nothing
 * below ran for them at all. Widening it is what makes the gate reachable —
 * if you ever narrow it again, the gate goes dead silently and the only thing
 * still standing is the `requireAdmin()` calls in the handlers themselves.
 *
 * ── Locale ────────────────────────────────────────────────────────────────
 * Every storefront URL carries its locale: /ar/... and /fr/.... A path with no
 * locale is redirected to one, and which one depends on *why* the path has no
 * locale:
 *
 *   "/"          the front door. French is the default language, so it goes to
 *                /fr — unless the visitor explicitly picked a language before,
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
 * report fr-FR or en-US regardless of what the visitor actually reads, so
 * detection would be noise on top of a default that already matches the
 * majority. The cookie is written only by the language switcher, so it is the
 * one signal that reflects an actual choice.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isAdminPath(pathname) || isApiPath(pathname)) {
    return gateAdminSurface(request, pathname, search);
  }

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

/**
 * The admin gate. Reached only for /admin/* and /api/*, and deliberately never
 * sets LOCALE_HEADER — `isStorefrontRequest()` keys off that header to decide
 * `<html lang>`, so tagging an admin request would flip the dashboard to
 * Arabic and RTL.
 */
async function gateAdminSurface(
  request: NextRequest,
  pathname: string,
  search: string,
) {
  if (isLoginPath(pathname)) return NextResponse.next();

  const method = request.method.toUpperCase();
  if (isApiPath(pathname) && isPublicApiRequest(pathname, method)) {
    return NextResponse.next();
  }

  // The nightly cron has no cookie jar, so it presents a bearer token instead.
  if (isCronSharedPath(pathname) && isCronRequest(request)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  // An API caller gets a status code it can act on; a browser gets the login
  // form, with the path it was reaching for so login can land it back there.
  if (isApiPath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login, 307);
}

export const config = {
  /**
   * Storefront locale routing plus the admin gate. /admin and /api are now IN
   * (they used to be excluded) — `proxy()` splits them off itself. Still spared:
   * Next's internals and the SEO files served from the app root, which would
   * otherwise be redirected to /fr/sitemap.xml and 404.
   *
   * `_next` is excluded wholesale rather than as `_next/static|_next/image`.
   * Those two alternatives left `/_next/webpack-hmr` matching, so the dev
   * HMR socket was being redirected to /fr/_next/webpack-hmr and failing —
   * a pre-existing bug, fixed here because this line now has to be right.
   *
   * SECURITY: this matcher is what makes the admin gate reachable at all.
   * Narrowing it back to exclude `admin` or `api` silently reopens the whole
   * dashboard. tests/auth/proxyGate.test.ts replays this regex to catch that.
   */
  matcher: ["/((?!_next|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)"],
};
