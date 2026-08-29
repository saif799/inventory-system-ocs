import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/**
 * Server-side auth guards. Separate from `session.ts` because these reach for
 * `next/headers`, which `proxy.ts` cannot import — keeping the crypto in a
 * runtime-neutral module is what lets one implementation cover both.
 *
 * proxy.ts already blankets /admin and /api, so everything here is the second
 * layer. That layer is not redundant: proxy-only auth is a well-known Next.js
 * footgun (a matcher that stops matching, an internal request path that skips
 * it, a future `export const runtime` change) and these calls hold even if the
 * proxy is bypassed entirely.
 */

/** True when the caller presents a valid admin session cookie. */
export async function hasAdminSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * Guard for a route handler. Returns a 401 Response to hand straight back, or
 * `null` when the caller is authenticated:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<Response | null> {
  if (await hasAdminSession()) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Guard for a Server Component. Redirects to the login page instead of
 * returning anything, so it never falls through — `redirect()` throws.
 */
export async function requireAdminPage(nextPath?: string): Promise<void> {
  if (await hasAdminSession()) return;
  const target = nextPath
    ? `/admin/login?next=${encodeURIComponent(nextPath)}`
    : "/admin/login";
  redirect(target);
}
