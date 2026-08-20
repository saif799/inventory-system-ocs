# Notifier System Overhaul — Gallery Sync

## Context
The `image_notifier_table` is a reminder list that helps you keep your external **gallery in sync with stock**: when a variant becomes unavailable you remove its photo; when it becomes available again you add it back. Today the logic is broken/incomplete:

- It inserts a reminder on **every** sale/lend/return regardless of stock, so the list fills with noise for variants that are still in stock.
- Online **order creation never inserts** anything (`app/api/order/route.ts:172` is a `//TODO`), so real sales are missed.
- There is **no field marking direction** (remove vs add-back). The UI can't tell "remove from gallery" apart from "add back". `orderId` is an unreliable proxy (lend-returns have no `orderId`).
- The table has **no `createdAt`**, so no recency/sorting.

**Goal:** only flag a variant when its availability actually flips (stock → 0, or 0 → back), tag each entry with a direction, and rebuild the page into two clear sections that also show live stock, group by product, show order info on returns, and auto-cancel entries that net out.

### Decisions (from user)
- **Remove trigger:** exact size-variant reaches `quantity === 0`.
- **Add-back trigger:** only when the variant was **out of stock before** the return makes it available again (symmetric rule).
- **Include all four extras:** live stock + sizes in card, group by product, order/customer info on returns, auto-cancel opposing entries.

---

## Implementation

### 1. Schema + migration — `lib/schema.ts`
Extend `ImageNotifierTable` (lines 95-101):
```ts
export const ImageNotifierTable = pgTable("image_notifier_table", {
  id: uuid().primaryKey().defaultRandom(),
  shoeInventoryId: uuid("shoe_inventory_id").notNull().references(() => shoeInventory.id),
  orderId: varchar("order_id").references(() => ordersTable.id),
  direction: varchar("direction").notNull().default("remove"), // 'remove' | 'restock'
  createdAt: date("created_at").notNull().defaultNow(),
});
```
Apply with the existing tooling: `pnpm push` (Drizzle Kit, `drizzle.config.ts` already present).
Backfill legacy rows so the new UI groups them correctly:
`UPDATE image_notifier_table SET direction = 'restock' WHERE order_id IS NOT NULL;`

### 2. Reusable helper — new `lib/notifier.ts`
One function used by every insert point. It encapsulates **dedupe + auto-cancel** (extra feature #4), so call sites only decide *whether* availability flipped:
```ts
// flagNotifier(inventoryId, "remove" | "restock", orderId?)
//  - if an OPPOSITE-direction row exists for this variant -> delete it, insert nothing (they cancel out)
//  - else if a SAME-direction row already exists -> no-op (already pending)
//  - else insert { shoeInventoryId, direction, orderId }
```
Implemented with `db.delete(...).returning()` for the opposing row, then an existence check, then insert. Keeps **at most one pending action per variant**.

### 3. Gate each of the 6 insert points
The helper handles dedupe; each site decides the flip condition using stock it already computes.

**Remove side (flag only when that size hits 0):**
- `app/api/store-sales/route.ts:30-35` — `updated` is already returned; replace the unconditional insert with: if `updated.quantity === 0` → `flagNotifier(inventoryId, "remove")`. Keep the `storeSales` insert.
- `app/api/order/route.ts:163-172` — add `.returning()` to the decrement (and switch `quantity - 1` → `GREATEST(0, quantity - 1)` for consistency with every other path); for each returned row with `quantity === 0` → `flagNotifier(row.id, "remove")`. This implements the `//TODO` at line 172.
- `app/api/lended-shoes/route.ts:124-126` — lending doesn't change `quantity`; availability = `remainingToLend - safeQuantity` (both already computed). If `=== 0` → `flagNotifier(inventoryId, "remove")`.

**Add-back side (flag only when it was out before):**
- `app/api/order/route.ts:233-257` (DELETE/cancel) — replace the raw-SQL insert (251-256): first read `{id, quantity}` for the order's inventory items, increment by 1, then for each whose **prior** `quantity === 0` → `flagNotifier(id, "restock", orderId)`.
- `app/api/status/route.ts:79-110` (DHD "retour") — extend `itemsToreturn` select to also pull current `shoeInventory.quantity` (join on `shoeInventory`), capture as prior qty, increment, then `flagNotifier(item.shoeInventoryId, "restock", item.orderId)` only where prior qty was 0.
- `app/api/lended-shoes/bring-back/route.ts:58-60` — availability = `shoeInventory.quantity - SUM(lent over ALL borrowers)`; add a global-lent query (current summary is per-borrower). If `availableBefore <= 0` and `availableBefore + safeQuantity > 0` → `flagNotifier(inventoryId, "restock")`.

### 4. Enrich `GET /api/notifier` — `app/api/notifier/route.ts`
Add to the select so the card needs no extra page (extra feature #1 & #3): `direction`, `shoeInventory.quantity`, `shoes.id` (shoeId, for grouping), `shoes.hexCode`, `orderId`, `createdAt`, and **leftJoin `ordersTable`** for `ordersTable.nom_client` + `ordersTable.reference`. Order by `createdAt desc`.

### 5. Bulk dismiss — `app/api/notifier/route.ts`
Add a collection `DELETE` accepting `{ ids: string[] }` (uses `inArray`) so "dismiss whole product" is one request. Keep the existing single `DELETE /api/notifier/[id]`.

### 6. Rebuild the page — `app/notifier/page.tsx`
Client component, plain `fetch` (matches existing pattern). Reuse `components/ui/{card,badge,button}` and `sonner` toasts.
- **Segmented toggle** at top: `Remove from gallery (n)` | `Add back (n)`, filtering by `direction`.
- **Group rows by `shoeId`** (model+color) → one card per product (extra #2). Card header: model name + color swatch from `hexCode`. Body: a chip per size showing `size` + live `quantity`, with a small badge (red "Out" for remove / green "Back" for restock).
- Restock cards show **order reference + customer name** (extra #3).
- Per-size dismiss (single DELETE) and **"Mark product done"** (bulk DELETE of all that product's ids in the active section). Optimistic state update; toast on success/error.
- Keep loading + empty states.

---

## Gaps found (addressed) / noted
- **Fixed:** unconditional inserts (store-sale, lend); missing order-create insert; missing direction field; missing `createdAt`; `order` POST allowing negative stock (no `GREATEST`).
- **Noted (not changing unless you want):** stock mutations + notifier writes run via `Promise.all`, not a DB transaction — a partial failure can desync. Out of scope for this pass; flag for a later transactional refactor.

## Verification
1. `pnpm push` to apply schema; `pnpm dev`.
2. **Remove – fires:** sell the **last** unit of a size (store-sales endpoint / UI) → variant appears under *Remove from gallery*, stock shows `0`.
3. **Remove – suppressed:** sell a size that still has stock left → **no** new entry.
4. **Order create:** place an order that zeroes a size → appears under Remove (verifies the old TODO).
5. **Add-back – fires:** cancel/`retour` an order whose variant was at 0 → appears under *Add back* with the order reference + customer name.
6. **Add-back – suppressed:** return a variant that still had stock → no entry.
7. **Auto-cancel:** sell a size to 0 (Remove entry appears) → cancel/return that same variant → both net out and the entry disappears (no leftover).
8. **Group + dismiss:** a model+color with two zeroed sizes shows as one card with two chips; "Mark product done" clears both.
