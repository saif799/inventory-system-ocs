import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/auth/guard";
import LoginForm from "./LoginForm";

/**
 * /admin/login — the one page under /admin that proxy.ts lets through.
 *
 * It lives OUTSIDE the (admin) route group on purpose: that group's layout
 * renders the admin sidebar, and a nav full of links you cannot follow is a
 * worse login screen than no nav at all.
 */
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in: skip the form. Without this, a bookmarked /admin/login
  // is a dead end that asks for a password you have already given.
  if (await hasAdminSession()) redirect(safeNext(next));

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LoginForm next={safeNext(next)} />
    </main>
  );
}

/**
 * `next` arrives from the query string, so it is attacker-controlled: an
 * absolute URL there would turn the login page into an open redirect that
 * bounces a signed-in owner to someone else's site. Only same-origin paths
 * survive — and `//evil.com` is rejected too, since browsers read a
 * protocol-relative URL as absolute.
 */
function safeNext(next: string | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/") || next.startsWith("//")) return "/admin";
  return next;
}
