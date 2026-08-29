import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth/session";

/**
 * POST /api/auth/login — exchange the admin password for a session cookie.
 *
 * Public by necessity (it is how you stop being anonymous), and the only route
 * in the app that reads ADMIN_PASSWORD.
 */
export async function POST(request: Request) {
  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 },
    );
  }

  let ok: boolean;
  try {
    ok = await verifyPassword(password);
  } catch (error) {
    // ADMIN_PASSWORD or AUTH_SECRET is missing. Say so in the log, but not in
    // the response — the client has no business learning how we are configured.
    console.error("Admin login is misconfigured:", error);
    return NextResponse.json(
      { error: "Login is not configured on this deployment." },
      { status: 500 },
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    // Off in dev so `pnpm dev` over plain http still works; on everywhere else.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
