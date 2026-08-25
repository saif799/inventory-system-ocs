/**
 * `server-only` throws on import outside a React Server Component, which is the
 * whole point of it in app code — but it also means any Vitest suite that
 * reaches a server module dies at import time. Aliased to this no-op in
 * vitest.config.ts so the guard stays real in the build and inert in tests.
 */
export {};
