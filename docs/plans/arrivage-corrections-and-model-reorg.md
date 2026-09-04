# Plan — Arrivage corrections & product model reorganisation

Status: **draft, awaiting approval**. Produced by a grilling session; every decision below
was chosen explicitly, not inferred. No code written yet.

Two independent features:

- **Part A — Arrivage corrections.** Edit, void and delete a recorded shipment.
- **Part B — Product model reorganisation.** Move a colour variant to another model; merge
  two duplicate models.

---

## 0. What the session settled

| # | Decision | Chosen |
|---|---|---|
| 1 | Deleting an arrivage | **Void, not delete** — reverse the stock, keep the row struck-through |
| 2 | Editable parts | line quantity, remove line, add line, change a line's size/variant. Metadata (`reference`/`note`) added by default — always editable, no stock effect |
| 3 | Variants a voided arrivage created | Survive; **auto-archived** when nothing else references them |
| 4 | Mistake vs history | **Untouched → free edit/hard-delete. Frozen → void + downward correction only** |
| 5 | Movement reason | New **`arrival-correction`** in the `applyMovement` union |
| 6 | "Frozen" test | No `order_items` / `store_sales` / `lended_shoes` row against any of its inventory rows **and** each line's current quantity ≥ what the line added |
| 7 | Void that can't fully reverse | **Refuse and name the lines.** A *downward correction* is exempt — it floors, deliberately |
| 8 | Void scope | **Per-line void** on frozen arrivages, plus whole-arrivage |
| 9 | Untouched delete | **Hard-delete** — row and its items gone |
| 10 | Frozen operations | **Lower quantity + add line.** Raising a frozen line is blocked |
| 11 | Dead size rows | **Delete the `shoe_inventory` row when provably unreferenced** |
| 12 | Voided arrivage display | Dimmed, excluded from totals, **un-void re-applies the stock** |
| 13 | Move/merge pricing | **Inherit the destination model's price**, with a confirmation listing every price change |
| 14 | Merge colour clash | **Refuse and list the clashes** |
| 15 | Emptied model after merge | **Delete the row** |
| 16 | UI placement | Arrivage editing inline in the expanded row; move on the variant edit page; merge on the model card header |
| 17 | Docs | One ADR (0007) + full glossary set, French badges (`annulé`, `verrouillé`) |

### The domain insight this rests on

`shoeInventory.quantity` is **not a measured count — it is a running estimate that can sit
above reality.** Record 20 when 15 arrived, sell the 15, and the remaining "5" is *Phantom
Stock*: the app will let you sell it (nothing blocks an admin order at zero and
`applyMovement` floors silently), but no pair exists. Over-count never drains on its own.

This is why a **downward correction is always allowed even when it floors** — a shortfall
that was never real is exactly what you are erasing — while a **full void refuses** rather
than flooring, because voiding is a claim that the whole shipment never happened.

---

## Part A — Arrivage corrections

### A1. Arrivage states

- **Untouched** — nothing has happened against any of its lines. Freely editable, hard-deletable.
- **Frozen** (`verrouillé`) — something has. Downward corrections, per-line void, add-line, whole void.
- **Voided** (`annulé`) — reversed. Dimmed, uncounted, un-voidable.

An arrivage may be **partially voided**: itself live, some lines voided.

### A2. Schema (`lib/schema.ts`, applied with `pnpm push` — never `generate`)

```
arrivals.voidedAt      timestamptz null   -- null = live
arrivalItems.voidedAt  timestamptz null   -- per-line void
```

A line counts as voided if either its own or its arrivage's `voidedAt` is set.

`arrivalItems.quantity` becomes **mutable**. Its comment must change: the snapshot records
*what arrived*, not *what remains*. Correcting it means it recorded the wrong thing — it is
still never re-synced to live `shoeInventory.quantity`. That distinction is the whole point
of ADR-0007.

### A3. Movement reason (`lib/stock/movement.ts`)

Add `"arrival-correction"` to `MovementReason`:

- `DIRECTION`: `"decrement"`
- in `FLAGS_NOTIFIER`: **yes.** `flagNotifier` already nets out an opposing pending action,
  so an arrival's `restock` followed by a correction's `remove` cancels itself when the
  mistake is caught before the gallery consumes it.
- not in `BORROWER_REQUIRED`, no `LENDED_SIGN`.

One reason covers all three downward cases: whole-arrivage void, line void, quantity lowered.
Un-void re-applies with the existing `arrival` reason.

### A4. The frozen test — `lib/arrivals/frozen.ts`

`isFrozen(arrivalId, exec?)` returning `{ frozen, reasons }`.

Untouched ⟺ **for every non-voided line**:

1. no `order_items` row references its `shoeInventoryId`
2. no `store_sales` row references it
3. no `lended_shoes` row references it
4. current `shoeInventory.quantity` ≥ the quantity this arrivage put into that row

Two lines in one arrivage can target the same `shoeInventoryId` (two lines, same shoe,
overlapping sizes) — **aggregate by `shoeInventoryId` before the check 4 comparison.**

Keep the comparison a pure function over fetched rows, so it is unit-testable the way
`lib/arrivals/validate.ts` already is.

### A5. API

`PATCH /api/arrivals/[id]` — verb-shaped body, one operation per call:

| op | Untouched | Frozen | Effect |
|---|---|---|---|
| `metadata` | yes | yes | `reference` / `note`. No stock effect |
| `set-line-quantity` | yes, any value | **lower only** | Delta via `arrival-correction` (down) or `arrival` (up). Down floors silently |
| `add-line` | yes | yes | New `arrival_items` row + `arrival` movement. Creates the `shoe_inventory` row if the size is new |
| `remove-line` | yes | no | Reverse + delete the row. Frozen uses `void-line` instead |
| `move-line` | yes | no | Change a line's size or variant. Frozen expresses it as lower-to-0 + `add-line` |
| `void-line` | — | yes | Reverse the line, set `voidedAt`, row survives struck-through |

`DELETE /api/arrivals/[id]` — the server picks the mode from the frozen test and returns
`{ mode: "deleted" | "voided" }`. Untouched → reverse + delete (`arrival_items` already
cascades). Frozen → reverse + set `arrivals.voidedAt`. The UI already knows which it will be
and says so in the confirm dialog.

`POST /api/arrivals/[id]/unvoid` — re-applies with reason `arrival`, clears `voidedAt`.

**Refuse rule** (whole void, line void, un-void — *not* downward corrections): if any line's
reversal would take `shoeInventory.quantity` below zero, refuse with 400 and name every
offending line: `Volt 42: arrivage added 8, only 3 in stock`. Points at `EditInventoryDialog`
for a correction instead.

Every mutation runs inside `txClient().transaction()` — stock plus `arrival_items` plus
notifier flags are one atomic write — and ends with `revalidateStockPaths()`.

**Auth:** nothing to change. `lib/auth/protected.ts` defaults closed, so these are gated the
moment they exist.

### A6. Cleanup

**Auto-archive orphaned variants.** After a void or delete, set `shoes.archived = true` on
any variant whose entire stock came from this arrivage and which has no `shoe_images`,
`storefront_collection_items`, `order_items`, or `lended_shoes` behind it. Archived already
means "out of the storefront and every picker, history and URL intact" — one click restores.
Models are created separately via `/api/models`, so nothing archives at model level.

**Delete dead size rows.** When a correction or void takes a line to zero, drop the
`shoe_inventory` row if **none** of the five FKs into it survive: `order_items`,
`store_sales`, `lended_shoes`, `image_notifier_table`, `arrival_items`.

> **Consequence you should know about.** A *voided* line keeps its `arrival_items` row,
> which FKs `shoe_inventory` — so the size 43 you typed instead of 42 on a **frozen**
> arrivage can never be deleted. It survives at quantity 0 in the size list. The untouched
> path (hard-delete → items cascade → row deletable) covers the same-day catch, which is
> when you actually notice. Options if this bites: snapshot `shoeId`/`size` onto
> `arrival_items` so voided lines stop needing the FK, or add `archived` to
> `shoe_inventory`. **Recommend accepting the limitation for now.**

### A7. UI — `app/admin/(admin)/arrivals/ArrivalsList.tsx`

Inline in the already-existing expanded row. No new route.

- **Row badges:** `annulé` (voided — row dimmed and struck), `verrouillé` (frozen),
  `partiellement annulé` (some lines voided).
- **Totals** (Variants / Pairs) exclude voided lines.
- **Expanded detail** gains an *Edit* toggle: a quantity input per line, a void/remove button
  per line, an add-line row (variant + size + quantity pickers), and `reference`/`note` fields.
- Frozen lines: quantity input capped at its current value, with a tooltip saying why.
- **Delete/Void button** in the expanded header. Confirm dialog states which will happen and
  lists the stock each line gives back — or, on refusal, which lines block it.
- Voided rows get an *Un-void* action.

### A8. Tests (`tests/arrivals/`, Vitest + PGlite; run with `--maxWorkers=1`)

Frozen test — each of the four conditions, plus the same-inventory-row aggregation case ·
refuse rule fires and names lines · downward correction floors without refusing · raising a
frozen line is rejected · void then un-void round-trips the stock · auto-archive fires only
when unreferenced · dead size row deleted on the untouched path, retained on the voided path ·
notifier `restock`/`remove` net out.

---

## Part B — Product model reorganisation

`modelId` is referenced **only** by `shoes` — inventory, images, collection items and orders
all hang off `shoeId`. Both operations are therefore a pure `shoes.modelId` repoint with
nothing else to chase.

### B1. Move a variant to another model

`PATCH /api/admin/products/[shoeId]` gains `modelId`.

- Destination must exist. Colour clash checked within the destination (reuse the existing
  case-insensitive guard) → 409 listing the clash.
- Price **inherits** the destination's `basePrice` / `compareAtPrice`. Variants carrying their
  own `priceOverride` are unaffected; size-level overrides are never touched.
- Client shows `12000 → 9000 DA` per affected variant before committing.

### B2. Merge two models

`POST /api/admin/models/[modelId]/merge`, body `{ intoModelId }`.

1. **Preflight** returns colour clashes and, if clean, a per-variant
   `{ color, from, to, inStock, hasImages }` price table.
2. Any clash → **refuse**, listing them. You rename or archive one side first.
3. Clean → repoint every `shoes.modelId`, then **delete** the now-empty source `shoeModels`
   row. One transaction.
4. `revalidatePath` on `/admin/products`, `/admin`, and the `/[lng]` layout.

> Variants moving from a model that has a `compareAtPrice` to one that doesn't lose their
> strikethrough price. Surfaced in the confirmation table as `—`.

### B3. UI

- **Move** — on `/admin/products/[shoeId]/edit`, in the details card beside colour and
  archive: a model combobox + *Move*, with the price-delta confirm.
- **Merge** — on the model card header in `ProductsAdminClient`, next to rename and archive:
  opens a dialog to pick the model to absorb, shows clashes or the price table, confirms.
- `GET /api/models` currently withholds archived models; both pickers need an
  `includeArchived` option, since the duplicate you are merging away is often already archived.

### B4. Tests (`tests/products/`)

Merge refuses on clash and names it · merge repoints every variant and deletes the source ·
move repoints and reprices · a variant with `priceOverride` is unaffected by both.

---

## Part C — Documentation

**`CONTEXT.md`** — new terms: **Arrivage**, **Voided Arrivage**, **Frozen Arrivage**,
**Arrivage Correction**, **Phantom Stock**. Plus a line under *Variant Pricing* recording
that move and merge inherit the destination model's price.

**`docs/adr/0007-arrivage-corrections.md`** — void-not-delete; the untouched/frozen split and
why "untouched" is a question the database answers rather than a clock; `arrival-correction`
extending ADR-0004; and what the "immutable snapshot" actually promises.

Also update: the `arrival_items` comment in `lib/schema.ts`, and the arrivals bullet in
`CLAUDE.md`.

---

## Order of work

1. Schema + `arrival-correction` + `lib/arrivals/frozen.ts` (+ tests)
2. Arrivals API — PATCH ops, DELETE, unvoid
3. `ArrivalsList` UI
4. ADR-0007 + CONTEXT.md
5. Products: move
6. Products: merge

Part A is self-contained and is the one costing money now. Part B can land separately.
