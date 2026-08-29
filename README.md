# OCS — Inventory System & Storefront

A single Next.js 16 app that runs two surfaces for a shoe business in Algeria:

- **Storefront** (`/`) — public bilingual catalog (French / Arabic), product pages, and cash-on-delivery checkout.
- **Admin dashboard** (`/admin`) — inventory, orders, arrivals, borrowers, analytics, and storefront CMS for the owner.

Stack: Next.js 16 App Router · React 19 · Tailwind v4 + shadcn/ui · Drizzle ORM on Neon Postgres · Cloudflare R2 for images · deployed on Vercel.

## Quick start

```bash
pnpm install
cp .env.example .env      # fill in the values
pnpm push                 # apply lib/schema.ts to the database
pnpm dev
```

Then open http://localhost:3000 for the storefront and http://localhost:3000/admin for the dashboard (log in with `ADMIN_PASSWORD`).

## Scripts

```bash
pnpm dev                 # next dev
pnpm build               # next build
pnpm start               # next start
pnpm test                # vitest run
npx tsc --noEmit         # the real typecheck — the build ignores TS errors

pnpm push                # drizzle-kit push — the schema workflow used here
pnpm studio              # drizzle-kit studio
```

**Schema changes go through `pnpm push`, not migrations.** `drizzle/` holds one stale migration from an early commit and is not maintained.

**`next.config.mjs` sets `typescript.ignoreBuildErrors`** — a green `pnpm build` proves nothing about types. Run `npx tsc --noEmit`.

## How it's laid out

| Path | What lives there |
| --- | --- |
| `app/(storefront)/[lng]/` | Public store: catalog, product page, checkout, confirmation |
| `app/admin/(admin)/` | Dashboard: products, add-shoes, arrivals, orders, analytics, notifier, borrowers, rebalance, storefront CMS, settings |
| `app/api/` | REST routes for both apps; admin-only mutations under `app/api/admin/` |
| `lib/` | Schema, stock movement, delivery providers, auth, i18n, R2, helpers |
| `tests/` | Vitest suites against a PGlite test DB (`tests/testDb.ts`) |
| `docs/adr/` | Accepted architecture decisions |
| `CONTEXT.md` | Domain glossary — the canonical vocabulary |

[proxy.ts](proxy.ts) (Next 16's renamed `middleware.ts`) gates the admin surface, then routes storefront locales.

## Core concepts

**Data model.** `shoeModels` (a style) → `shoes` (a color variant, whose PK doubles as the printed barcode) → `shoeInventory` (one row per size, the unit of stock everything points at). Orders are keyed by the delivery provider's tracking number.

**Stock movement.** Every change to stock goes through `applyMovement` in [lib/stock/movement.ts](lib/stock/movement.ts) — no route or script writes `shoeInventory.quantity` directly ([ADR-0004](docs/adr/0004-all-stock-movement-goes-through-lib-stock.md)). Writes touching stock *and* another table must run inside a transaction (`txClient()` in [lib/db.ts](lib/db.ts); the default neon-http driver has no transactions).

**Borrowers.** An append-only signed ledger, not a balance — a borrower is a storage location, not a sale ([ADR-0003](docs/adr/0003-borrower-ledger-is-a-location-ledger.md)). Holdings are always `SUM(quantity)`.

**Pricing.** Integer DZD, resolved size override → color override → model base price, first non-null wins ([ADR-0002](docs/adr/0002-model-level-pricing.md)).

**Delivery.** Couriers sit behind the `DeliveryProvider` interface in [lib/delivery/](lib/delivery/) — DHD (default, the only one checkout allows) and Yalidine. A daily Vercel cron hits `/api/status` to sync parcel statuses.

**Auth.** One password, one owner, no user table. `/admin/*` and every `/api/*` route outside an explicit allowlist require a signed session cookie ([ADR-0005](docs/adr/0005-admin-auth-is-a-single-password-signed-cookie.md)). The allowlist in [lib/auth/protected.ts](lib/auth/protected.ts) defaults closed — a new route is protected the moment it exists.

## Environment

Copy [.env.example](.env.example) and fill it in: `DATABASE_URL`, the auth trio (`ADMIN_PASSWORD` / `AUTH_SECRET` / `CRON_SECRET`), delivery provider keys, Cloudflare R2 credentials, and the storefront's public vars. Every variable is required unless the file marks it optional.

## Contributing

Issues and specs live in GitHub Issues, driven by the `gh` CLI — see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md). Read the ADRs covering an area before changing it, use [CONTEXT.md](CONTEXT.md)'s exact terms, and if a change contradicts an ADR, say so explicitly rather than silently overriding it. [CLAUDE.md](CLAUDE.md) is the deeper orientation doc for agents working in this repo.
