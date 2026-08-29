/**
 * Admin session: one owner, one password, no user table.
 *
 * This module is imported by `proxy.ts`, which runs on the Edge runtime, so it
 * must stay free of Node built-ins — no `crypto` module, no `Buffer`. Everything
 * here is Web Crypto + `btoa`, which both the Edge and Node runtimes provide.
 *
 * The session is a stateless signed token rather than a stored session id:
 * with a single user there is nothing a session table would buy except a round
 * trip to Neon on every request. The cost is that logging out cannot invalidate
 * a token that has already been issued — see `logout` in the route handler.
 * Rotating AUTH_SECRET is the "log out everywhere" button.
 */

/** Cookie name. Deliberately not `session` — the storefront may want its own. */
export const SESSION_COOKIE = "ocs_admin_session";

/** 30 days. Long, because the only user is the owner on their own devices. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Read a required secret. Throws lazily (at call time, not module load) so a
 * missing env var surfaces as a failed login rather than a build that will not
 * start — and so the storefront keeps serving if only the admin vars are unset.
 */
function requireEnv(name: "ADMIN_PASSWORD" | "AUTH_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Admin auth cannot work without it — see .env.example.`,
    );
  }
  return value;
}

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return base64url(signature);
}

/**
 * Constant-time comparison. Only ever called on two HMAC digests, which are
 * fixed-length — so the early `length` return cannot leak anything about the
 * secrets themselves.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Check a submitted password against ADMIN_PASSWORD.
 *
 * Both sides are HMAC'd before comparison rather than compared directly. That
 * is not extra hashing for storage's sake — the env var is the secret either
 * way — it is what makes the comparison constant-length, so a timing attack
 * cannot even learn how long the real password is.
 */
export async function verifyPassword(submitted: string): Promise<boolean> {
  const secret = requireEnv("AUTH_SECRET");
  const [a, b] = await Promise.all([
    hmac(submitted, secret),
    hmac(requireEnv("ADMIN_PASSWORD"), secret),
  ]);
  return safeEqual(a, b);
}

/** Mint a token valid for SESSION_TTL_SECONDS: `<expiry>.<signature>`. */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(payload, requireEnv("AUTH_SECRET"))}`;
}

/**
 * Validate a token from the cookie. Returns false for anything malformed,
 * expired, or signed with a different secret. Never throws on bad input — a
 * garbage cookie is a logged-out user, not a 500. A *missing* AUTH_SECRET does
 * throw, because silently treating everyone as logged out would be worse than
 * a loud failure.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;

  const separator = token.indexOf(".");
  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(payload);
  if (!Number.isSafeInteger(expiresAt)) return false;
  if (expiresAt <= Math.floor(Date.now() / 1000)) return false;

  return safeEqual(signature, await hmac(payload, requireEnv("AUTH_SECRET")));
}

/**
 * The Vercel cron caller. Vercel sends `Authorization: Bearer $CRON_SECRET` on
 * scheduled invocations once CRON_SECRET is set in the project's env.
 *
 * This exists because GET /api/status has two legitimate callers — the nightly
 * cron and the admin "sync now" button — and a session-only guard would lock
 * out the cron silently: the job would keep returning 401 every night with
 * nobody watching, and order statuses would quietly stop syncing.
 *
 * If CRON_SECRET is unset this returns false, so /api/status falls back to
 * being admin-only. That is the safe direction to fail.
 */
export function isCronRequest(request: {
  headers: { get(name: string): string | null };
}): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  if (!header) return false;
  return safeEqual(header, `Bearer ${expected}`);
}
