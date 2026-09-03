# Plan — Collection editor: model bulk-add & batched save

Status: **draft, awaiting implementation**. Produced by a grilling session; every decision
below was chosen explicitly by the owner, not inferred. No code written yet.

Scope is **`app/admin/(admin)/collections/[collectionId]/` only**. No API changes — both
`PATCH /api/admin/collections/[collectionId]` and `PUT /api/admin/collections/[collectionId]/items`
are used exactly as they exist today.

Two features plus two extras:

- **Part A — Model bulk-add.** Tick a Shoe Model, take all its colour variants at once.
- **Part B — Batched save.** Stop autosaving on every tick; one dirty state, one Save button.
- **Part C — Storefront status banner** and a **Hide offline** filter.
- **Part D — English normalisation** of the page, plus one ADR-0006 amendment.

---

## 0. What the session settled

| #  | Decision | Chosen |
|----|----------|--------|
| 1  | Model pick semantics | **Snapshot bulk-add** — colours are copied in as ordinary picks, once. No membership rule, no schema change |
| 2  | Which colours a model-add takes | **All of them**, offline ones included (they arrive badged `offline`) |
| 3  | Picker shape | **Model-grouped catalogue**, collapsible. Replaces the flat colour list entirely |
| 4  | Model checkbox + active filters | **One rule: it acts on exactly the colours currently displayed**, whether narrowed by search, by the offline filter, or both |
| 5  | Save scope | Everything **except the image**. The image keeps saving immediately on upload |
| 6  | Save call shape | **Two calls, dirty only** — reuse the existing PATCH and PUT, fire only what changed |
| 7  | After a successful save | **No `router.refresh()`** |
| 8  | Unsaved-work protection | **Fixed bottom save bar** (page header is not sticky) + leave warning |
| 9  | Discard | **Reverts fields and picks, behind a confirm** |
| 10 | Reordering 26 picks | **Arrows + new move-to-top / move-to-bottom.** No drag library |
| 11 | Extras taken | **Storefront status banner** + **Hide offline filter** |
| 12 | Extras declined | Visibility toggle in the editor; drag-and-drop; scroll-capped Selection list |
| 13 | Language | **This page fully English.** The Collections grid stays French |
| 14 | Docs | **Amend ADR-0006** with a Consequences bullet. No new ADR, no CONTEXT.md change |

### Facts this rests on

Measured against the live database during the session:

- **74 shoe models, 368 colour variants.** Median 3 colours per model; the fat tail is
  26, 23, 19, 19, 16, 14, 11, 10.
- Existing collections hold **2, 8 and 10 picks**.
- `MAX_ROWS = 300` is **below** the 368 variants, so today's flat picker silently truncates
  the catalogue — you cannot reach every variant without typing. 74 group rows fixes that.
- `StorefrontProduct` already carries `modelId` ([lib/storefront/products.ts](../../lib/storefront/products.ts));
  `CatalogEntry` simply drops it. That is the whole data change.
- `AdminPage`'s header is **not sticky** ([components/admin/AdminPage.tsx](../../components/admin/AdminPage.tsx)),
  so today's `Enregistrer` button scrolls out of view the moment you are in the catalogue.
  That is why the save bar is fixed to the bottom rather than living in the header.

### The bug that was reported, and what it actually is

The owner reported the editor "resetting" on every pick. **It is not a data reset.**
`saveItems` is already optimistic and nothing calls `router.refresh()` on an item save, so
no server read ever clobbers local state. What is real:

1. The **Selection** list sits directly above the catalogue in the same column, so every
   tick grows it by roughly one row height and shoves the catalogue down under the cursor.
2. The `Enregistrement…` spinner flickers on every click.

Batching removes (2). It does **not** remove (1) — the list still grows locally. The owner
was shown the six-line fix (a `max-h` + `overflow-y-auto` on the Selection list) and
**declined it**. Do not add it unprompted.

---

## Part A — Model bulk-add

### A1. Type change

`app/admin/(admin)/collections/types.ts` — `CatalogEntry` gains:

```ts
/** null only for a pick whose product no longer resolves. */
modelId: string | null;
```

Nullable because `[collectionId]/page.tsx` already synthesises a `"Produit introuvable"`
entry for a pick whose `shoeId` is gone from the catalogue. Such an entry has no model,
never appears in the catalogue panel, and only ever renders in the Selection list.

### A2. Server change

`app/admin/(admin)/collections/[collectionId]/page.tsx` — two one-line additions:

- in the `items.map(...)`: `modelId: product?.modelId ?? null`
- in `catalogForPicker`: `modelId: product.modelId`

Nothing else on the server moves.

### A3. Grouping

Derive once from `catalog`, memoised:

```ts
type ModelGroup = {
  modelId: string;
  modelName: string;
  /** First colour's primary image, for the group row thumbnail. */
  thumbUrl: string | null;
  colours: CatalogEntry[];
};
```

- Groups sorted by `modelName` with `localeCompare`.
- Colours within a group sorted by `color` with `localeCompare`.
- `thumbUrl` is the first colour with a `primaryImageUrl`, else `null` (falls back to the
  existing `Thumb` placeholder).

### A4. Filter pipeline

Applied in this order, before grouping:

1. **Hide offline** — if the toggle is on, drop every entry with `isLive === false`.
2. **Search** — the existing `normalize()` + all-tokens-must-match rule, unchanged, against
   the same `${modelName} ${color}` haystack. Keep the existing memoised `searchable` array.
3. Group the survivors. Groups left with zero colours disappear.
4. `MAX_ROWS` (300) now caps **groups, not colours**. With 74 models it never bites today;
   keep it as a guard and update the overflow line to count groups.

### A5. Group row and the tri-state checkbox

For each group, `visible` is the group's surviving colours after A4.

- `checked` — every `visible` colour is already picked.
- `indeterminate` — some but not all. Render via shadcn's `Checkbox checked="indeterminate"`.
- Clicking the group checkbox:
  - if `checked` → remove every `visible` colour from the pick list;
  - otherwise → append every `visible` colour not already picked, **at the end**, in group
    display order.

**The count in the row label must always equal what the click does.** Show
`{modelName} · {visible.length} colours` — where `visible.length` reflects the active
search and offline filter, not the model's total. This is decision #4 and it is the whole
point: the owner must never click a row saying 4 and receive 26.

Groups start **collapsed**; a chevron toggles. State is a `Set<string>` of expanded
`modelId`s.

**Auto-expand on search**: when `query` transitions empty → non-empty, seed the expanded set
with every matching group's id; when it transitions back to empty, clear the set. The chevron
then keeps working normally in both states, and expansion survives further typing.

**Single-colour models render as a plain row** — no chevron, no group/child distinction.
The checkbox toggles that one colour, and the label reads `{modelName} — {color}`, exactly
like a colour row does today. With a median of 3 colours per model, a large share of the 74
groups would otherwise be an expander wrapping one item.

### A6. What bulk-add is *not*

Nothing about the model is stored. A colour added to that model next month does **not** join
the collection. Individual colours added by a bulk-add are ordinary picks and can be removed
or reordered freely afterwards. See Part D2.

---

## Part B — Batched save

### B1. Delete the autosave machinery

Remove from `CollectionEditorClient.tsx`: `saveItems`, the `chain` ref and its comment,
`pending`, and the `Enregistré automatiquement` / `Enregistrement…` indicator. `toggle`,
`removeItem` and `moveItem` become pure local state updates.

### B2. State shape

- `baseline` — what the server last confirmed. Initialised from the `collection` prop,
  replaced on a successful save. This is what dirty is measured against and what Discard
  restores.
- `form` — `title`, `subtitle`, `imageAlt`, `slug` (as today).
- `items` — `CatalogEntry[]`, lifted out of the collection object so picks are independent
  local state.
- `image` — `imageKey` / `imageUrl`. **Immediate-save, never part of dirty** (see B6).
- `slugUnlocked`, `query`, `hideOffline`, `expandedModels`, `saving`.

### B3. Dirty computation

- `fieldsDirty` — any of `title` / `subtitle` / `imageAlt` differs from baseline after
  trimming and the same `|| null` normalisation the save body applies, **or**
  (`slugUnlocked` and `slug !== baseline.slug`).
- `itemsDirty` — `items.map(i => i.shoeId)` differs from the baseline's, **order-sensitive**
  (a reorder is a change).
- `isDirty = fieldsDirty || itemsDirty`.

### B4. Save

Fire **only the dirty calls**, sequentially:

```
if (fieldsDirty) → PATCH /api/admin/collections/[id]   (same body as today's save())
if (itemsDirty)  → PUT  /api/admin/collections/[id]/items  { shoeIds: items.map(i => i.shoeId) }
```

- Full success → set `baseline` to current state, `setSlugUnlocked(false)`, success toast.
  **No `router.refresh()`.** The server has just confirmed local state; refreshing would
  re-query all 368 variants and produce exactly the visible re-render the owner complained
  about. `revalidatePath` inside the route handlers still updates the storefront and the
  collections grid for the next visit.
- **Partial failure** — if the PATCH lands and the PUT fails: commit the fields half into
  `baseline`, leave `items` dirty, and toast naming the half that failed
  (`"Details saved, but the products could not be saved"`). The bar stays up showing only
  what is still unsaved. Do not roll back the half that succeeded.

The `Enregistrer` button leaves `AdminPage`'s `actions` slot entirely — only the
`Collections` back link stays there. When nothing is dirty there is no Save button, which is
correct.

### B5. Save bar

Rendered only when `isDirty`: `fixed inset-x-0 bottom-0 z-50 border-t bg-background`, inner
container matching `AdminPage`'s `max-w-6xl` and horizontal padding so it lines up with the
content above it.

- Left: what is unsaved, naming the halves — e.g. `Unsaved changes: details, products`.
- Right: **Discard** then **Save**.
- Add bottom padding to the page content while the bar is up so it cannot cover the last row.

**Discard** opens a confirm dialog naming what will be lost, then restores `form` and `items`
from `baseline` and re-locks the slug. It does not touch the image.

**Leave warning**: a `beforeunload` handler registered while dirty, plus a confirm on the
in-page `Collections` back link. Note honestly in a code comment that the App Router has no
supported way to intercept a sidebar navigation, so `AdminSidebar` links are **not** guarded —
`beforeunload` covers tab close and reload, the back link covers the intended exit, and the
sidebar remains a hole. Do not add global navigation-blocking state to close it.

### B6. The image stays immediate

`setImage` and `clearImage` keep PATCHing on the spot, exactly as today, and update both
`image` state and `baseline`. Deferring them would leave an orphaned R2 object in the bucket
on an abandoned edit and would delay the deletion of the object being replaced — the
route handler deletes the old key only once the row no longer references it. The image is
therefore never counted in the dirty state and never appears in the save bar.

### B7. Selection list reordering

Keep `ArrowUp` / `ArrowDown` / `X`. Add **move to top** and **move to bottom**
(`ChevronsUp` / `ChevronsDown` from lucide), disabled at the ends like the arrows are.

Rationale: a bulk-add of the largest model puts 26 rows in the list, where a single move can
cost 25 arrow clicks. Drag-and-drop was offered and declined — `@dnd-kit` would be a new
dependency for one panel and would leave two reorder idioms inside the same feature, since
the Collections grid reorders with arrows too.

---

## Part C — Extras

### C1. Storefront status banner

The editor currently never says whether the collection actually reaches the storefront.
Render a banner at the top of the page, above the two-column grid, using
[ADR-0006](../adr/0006-collections-replace-homepage-rails.md)'s three states **in this
precedence order**:

| Condition | State | Copy |
|---|---|---|
| no `imageUrl` | **Incomplete** | Not on the homepage — this collection has no image. The card *is* the image. |
| `isVisible === false` | **Hidden** | Hidden — switched off. Its URL returns 404. *(link back to `/admin/collections` to switch it on)* |
| no pick with `isLive` | **Empty** | Nothing live — every pick is unpriced or sold out. The card drops off the homepage, but `/collection/<slug>` still resolves. |
| otherwise | live | A quiet confirmation line, or nothing. |

Use the glossary's exact terms — Incomplete, Hidden, Empty are defined in
[CONTEXT.md](../../CONTEXT.md) and must not be renamed or merged here.

**Which state it reads from matters:** `imageUrl` and `isVisible` come from **saved** state
(neither is editable on this page), but the live-pick count comes from **current local
`items`**, so the banner reacts as you pick and unpick rather than lying until you save.

Hidden links back to the grid because the in-editor visibility toggle was offered and
declined.

### C2. Hide offline filter

A checkbox above the catalogue search, labelled **Hide offline**, **default off**.

Default off is load-bearing: it keeps the out-of-the-box bulk-add behaviour at "every colour
of the model" (decision #2). Turning it on narrows what a model checkbox takes, which is
correct and consistent under decision #4 — the box always takes what is on screen.

---

## Part D — Language and docs

### D1. English normalisation

Every string on this page becomes English. The page is already mixed (`Title`, `Subtitle`,
`Image alt text`, `Remove image` in English beside `Enregistrer`, `Sélection`, `Catalogue`,
`hors ligne`). Admin is `lang="en"` LTR per CLAUDE.md, so English is the correct target.

| Current | New |
|---|---|
| `Enregistrer` | `Save` |
| `Sélection (n)` | `Selection (n)` |
| `Catalogue` | `Catalog` |
| `Rechercher un modèle ou une couleur…` | `Search a model or colour…` |
| `Aucun produit. Cochez-en dans le catalogue ci-dessous.` | `No products yet. Pick some from the catalog below.` |
| `Aucun produit trouvé.` | `No products found.` |
| `n autres produits — affinez la recherche.` | `n more models — refine your search.` (now counts groups) |
| `hors ligne` badge | `offline` |
| `changer l'URL` | `Change URL` |
| the slug warning + locked hint | English equivalents, same meaning and the same ⚠️ |
| all toasts (`Collection mise à jour`, `Échec de…`, `Image mise à jour`, …) | English equivalents |

`Enregistré automatiquement` / `Enregistrement…` are deleted outright, not translated.

**The Collections grid (`CollectionsAdminClient.tsx`) stays French** — normalising it was
offered and scoped out. The two pages are briefly inconsistent by choice.

### D2. ADR-0006 amendment

Add one bullet to the **Consequences** section of
[docs/adr/0006-collections-replace-homepage-rails.md](../adr/0006-collections-replace-homepage-rails.md).
It must record, in the ADR's own voice:

- The admin picker groups the catalogue by Shoe Model and lets a whole model be taken in one
  click. **That is a bulk-add affordance, not membership.** The colours are copied in as
  ordinary hand-picked rows and can be removed or reordered individually.
- A **live model rule** — storing "model X" and resolving its colours at render time, so new
  colours join automatically — was on the table during design and **declined**. It is the
  classification model this ADR already rejected, it would remove per-colour removal and
  hand ordering, and it needs a schema change.
- So a colour added to a model later does not join any collection. Re-opening the collection
  and ticking the model again is the intended path.

This is deliberately an amendment rather than a new ADR: it is the same curation-vs-classification
decision the ADR already made, applied to a new affordance.

### D3. CONTEXT.md

**Unchanged.** No new domain terms. The status banner reuses Incomplete / Hidden / Empty
exactly as the glossary already defines them, which is the point of putting them on screen.

---

## Files touched

| File | Change |
|---|---|
| `app/admin/(admin)/collections/types.ts` | `CatalogEntry.modelId: string \| null` |
| `app/admin/(admin)/collections/[collectionId]/page.tsx` | Pass `modelId` through, both mappings |
| `app/admin/(admin)/collections/[collectionId]/CollectionEditorClient.tsx` | Everything else |
| `docs/adr/0006-collections-replace-homepage-rails.md` | One Consequences bullet |

No API route changes. No schema change, so **no `pnpm push`**.

## Verification

- `npx tsc --noEmit` — the only real typecheck; `next.config.mjs` sets
  `typescript.ignoreBuildErrors`, so a green build proves nothing.
- No test coverage exists for the collections admin; none is required by this plan.
- Manual: the admin pages do not hydrate in the preview pane, so exercise this in a real
  browser against `pnpm dev`.

## Explicitly out of scope

- **The Selection list layout shift.** Offered, declined. Batching removes the spinner
  flicker but the list still grows and pushes the catalogue down.
- **Drag-and-drop reordering** and the `@dnd-kit` dependency.
- **A visibility toggle in the editor** — the banner links back to the grid instead.
- **Normalising the Collections grid to English.**
- Any change to `PATCH /api/admin/collections/[collectionId]` or its items route.
