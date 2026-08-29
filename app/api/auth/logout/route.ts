import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * POST /api/auth/logout — drop the session cookie.
 *
 * This clears the cookie in *this* browser; it cannot revoke a token that has
 * already been copied elsewhere, because sessions are stateless signed tokens
 * with no server-side record to delete (see lib/auth/session.ts). If a token
 * ever leaks, rotate AUTH_SECRET — that invalidates every token at once.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
