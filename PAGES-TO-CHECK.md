# Pages to check — borrower/lender + rebalance + multi-provider changes

> **Note:** written before the admin dashboard moved under `/admin/*`. Every
> route below is now prefixed with `/admin` (`/orders` → `/admin/orders`,
> `/` → `/admin`, `/[borrowerId]` → `/admin/[borrowerId]`, …). `/` is the public
> storefront.

Run the app (`pnpm dev`) and walk these routes. Each item lists what changed and
what "correct" looks like. Schema was already applied with `pnpm push`
(`orders.provider`, `orders.borrower_id`, `rebalance_notifier_table`).

## `/orders` — order create / delete / sync
- **Create (owner):** open a product on `/`, click the order (package) icon → the
  form now has a **Delivery Company** dropdown, defaulting to **DHD**. Submit → order
  created via DHD (unchanged), stock −1, appears in `/orders`.
- **Provider = Yalidine:** switch the dropdown to **Yalidine** → delivery type is
  forced to **bureau (stop desk)** and the commune list now comes from the Yalidine
  file. Submitting calls the real Yalidine create API (see caveats below).
- **Delete:** row menu → Delete. Works for DHD. For a Yalidine order it returns a
  clear "not implemented yet" error (pending your delete-endpoint docs).
- **Sync:** the refresh button hits `/api/status`. It now pulls from all providers
  (Yalidine returns nothing yet) and **only updates orders whose id exists in our
  table** — parcels added manually on a provider dashboard are ignored.

## `/` — store sale & lend still flag correctly
- **Store Sale** (product menu): selling the last unit → variant shows on `/notifier`
  under *Remove from gallery* (unchanged), now inside a DB transaction.
- **Lend** (product menu): lending the last sellable unit still flags gallery remove;
  lending/returning also updates `/rebalance` (see below).

## `/borrowers` — borrower management (NEW)
- Each borrower row has a **⋯ menu**: **Rename** (dialog) and **Delete**.
- **Rename** to a name another borrower already has → blocked (409 toast).
- **Delete** a borrower who still holds shoes → blocked (409 toast). Delete one who
  holds nothing → removed and you stay on `/borrowers`.

## `/[borrowerId]` — borrower detail (NEW bits)
- Header shows the **borrower name** + the same **⋯ (rename/delete)**; deleting here
  redirects back to `/borrowers`.
- **Lending history** collapsible: shows `+n lent` / `−n returned` per event with date.
- **Send Order** (package icon, now visible in borrower view): the form defaults to
  **Yalidine** and, on submit, **draws from the borrower's held stock** — their held
  count drops, the physical total drops, your store count is unchanged. Trying to sell
  a variant the borrower doesn't hold → 400 error.
- **Bring Back** action unchanged.

## `/rebalance` — owner↔borrower view (NEW, live — no stored table)
- Two tabs, both **computed live** each time you open/refresh the page (there's a
  refresh button; no per-item dismiss).
- **Bring back** (grouped by borrower): variants where your sellable store is 0 while a
  borrower still holds some. Each row has an inline **qty + Bring back** button that
  posts to `/api/lended-shoes/bring-back` and refreshes — no need to open the borrower page.
- **Give some** (grouped by product): any variant you have **>1** of that **isn't
  currently lent to anyone**. Each size row has a **Lend** button (dialog with a borrower
  name — existing names autocomplete — + quantity) that posts to `/api/lended-shoes`.
- Both lists update themselves from `shoe_inventory` + `lended_shoes`; after a bring-back
  or lend the affected item leaves the list on refresh.

## Caveats / still pending your input
- **Yalidine create** is wired using the existing `createYalidineParcel` util + the
  `yalidinCommunes_withExpressDesk.json` mapping. It has **not** been tested against
  the live Yalidine API from here. Please confirm with one real order, and verify:
  - the **origin wilaya** — set `YALIDINE_FROM_WILAYA` in `.env` (defaults to `"Alger"`).
  - the **create response shape** matches `lib/Yalidin/parcel.ts`.
- **Yalidine delete + status sync** are stubbed (`lib/delivery/yalidine.ts`) pending
  the endpoint docs you'll provide.
