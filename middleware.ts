import { NextRequest, NextResponse } from "next/server";

/**
 * Marks storefront requests with a header so the root layout can pick
 * lang="fr" for the storefront and lang="en" for /admin. Admin routes are
 * untouched.
 */
export function middleware(request: NextRequest) {
  const isAdmin = request.nextUrl.pathname.startsWith("/admin");

  const requestHeaders = new Headers(request.headers);
  if (!isAdmin) {
    requestHeaders.set("x-ocs-storefront", "1");
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
