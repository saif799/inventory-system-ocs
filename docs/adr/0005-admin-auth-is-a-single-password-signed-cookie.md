# ADR 0005: Admin Auth Is a Single Password and a Signed Cookie

## Status
Accepted

## Context
`/admin/*` and nearly every `/api/*` route were open to the internet. The exposure was never really the pages — it was the ~24 route handlers behind them: `POST /api/store-sales`, `DELETE /api/order`, `PATCH /api/inventory/[id]`, `POST /api/r2/presigned-url` (which hands out R2 write credentials) and all of `/api/admin/*` were unauthenticated mutations against production data. The admin layout's `robots: noindex` kept the dashboard out of search results and stopped nobody who knew the URL.

There is exactly one user: the owner. There is no user table, no roles, no sign-up, and no plan for any of them.

## Decision
One password in `ADMIN_PASSWORD`, exchanged at `/admin/login` for an HMAC-signed, HttpOnly cookie carrying nothing but an expiry. `AUTH_SECRET` signs it; sessions are stateless, with no server-side record.

Enforcement is deliberately **two layers**:

1. `proxy.ts` gates every `/admin/*` and `/api/*` request. Pages get a 307 to the login screen carrying `?next=`; API routes get a 401.
2. `requireAdmin()` (route handlers) and `requireAdminPage()` (the `(admin)` layout) re-check the same cookie server-side.

The allowlist of public routes lives in one module, `lib/auth/protected.ts`, and **defaults closed**: a new route under `/api` is protected the moment it exists.

## Considered options
- **HTTP Basic Auth in the proxy** — ~15 lines instead of ~80, but the browser caches credentials with no way to log out, and the native prompt is poor on mobile. Rejected for the missing logout.
- **Vercel Password Protection** — zero code, but it is a paid Pro feature, protects the whole deployment rather than the admin half, and does nothing for `pnpm dev`. Rejected on cost and dev/prod divergence.
- **`next-auth` or a session table** — both solve problems this app does not have (multiple users, OAuth providers, revocation lists). A session table would add a Neon round trip to every admin request to track exactly one user. Rejected as unearned complexity.

## Consequences
- **Logout is local.** Clearing the cookie ends the session in that browser; it cannot revoke a token already copied elsewhere, because there is nothing stored to delete. Rotating `AUTH_SECRET` is the "log out everywhere" button.
- **`/api/status` accepts two credentials**, and is the only route that does. It serves both the Vercel nightly cron and the admin "sync now" button, so it takes either `Authorization: Bearer $CRON_SECRET` or a session cookie. A session-only guard would have failed silently — the cron would 401 every night with nobody watching, and delivery statuses would quietly stop syncing. If `CRON_SECRET` is unset the route falls back to admin-only, which is the safe direction to fail.
- **The public allowlist is method-aware, not path-aware.** `/api/order` shares one path between the storefront's checkout `POST` and an admin-only `GET`/`DELETE`. A path-only allowlist would have handed anyone the ability to delete orders.
- **The proxy `matcher` is now load-bearing for security.** It previously excluded `admin|api` outright; widening it is what makes the gate reachable at all. If it is ever narrowed again the gate goes dead with no error anywhere, which is why `tests/auth/proxyGate.test.ts` replays the real regex as a regression test.
- **No rate limiting.** Deliberate, given a single owner and a long random password. If brute-force protection is ever wanted, `@upstash/redis` is already a dependency.
- `/test-upload` and `/print-demo` were deleted rather than guarded: they were dev scratch pages outside `app/admin/`, and `/test-upload` rendered the R2 uploader.
