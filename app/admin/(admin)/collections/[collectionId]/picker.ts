/**
 * The editor's pure logic: the catalogue picker pipeline and the dirty
 * computation the save bar reads.
 *
 * Split out of `CollectionEditorClient` for the same reason
 * `products/params.ts` is: these are total functions over plain data, and
 * keeping them out of the component is what makes the tri-state checkbox rule
 * and the dirty rule testable without a DOM.
 */
import type { CatalogEntry } from "../types";

/** Case- and accent-insensitive haystack for the catalogue search. */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/** One Shoe Model and the colour variants of it the catalogue is showing. */
export type ModelGroup = {
  modelId: string;
  modelName: string;
  /** First colour's primary image, for the group row thumbnail. */
  thumbUrl: string | null;
  colours: CatalogEntry[];
};

/**
 * Filter the catalogue, then group what survives by Shoe Model.
 *
 * Order matters: the group rows are built from the *survivors*, so a group's
 * colour count always describes what is on screen — which is exactly what
 * ticking that group's checkbox acts on.
 */
export function buildGroups(
  catalog: CatalogEntry[],
  { query, hideOffline }: { query: string; hideOffline: boolean },
): ModelGroup[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const byModel = new Map<string, ModelGroup>();

  for (const entry of catalog) {
    if (entry.modelId === null) continue;
    if (hideOffline && !entry.isLive) continue;
    // Every token has to match, so "air white" finds "Air Force 1 — White".
    if (tokens.length > 0) {
      const haystack = normalize(`${entry.modelName} ${entry.color}`);
      if (!tokens.every((token) => haystack.includes(token))) continue;
    }
    let group = byModel.get(entry.modelId);
    if (!group) {
      group = {
        modelId: entry.modelId,
        modelName: entry.modelName,
        thumbUrl: null,
        colours: [],
      };
      byModel.set(entry.modelId, group);
    }
    group.colours.push(entry);
  }

  const groups = [...byModel.values()];
  for (const group of groups) {
    group.colours.sort((a, b) => a.color.localeCompare(b.color));
    group.thumbUrl = group.colours.find((c) => c.primaryImageUrl)?.primaryImageUrl ?? null;
  }
  groups.sort((a, b) => a.modelName.localeCompare(b.modelName));
  return groups;
}

/** How much of a group's *displayed* colour set is already picked. */
export type GroupSelection = "none" | "some" | "all";

export function groupSelection(group: ModelGroup, pickedIds: Set<string>): GroupSelection {
  const picked = group.colours.filter((c) => pickedIds.has(c.shoeId)).length;
  if (picked === 0) return "none";
  return picked === group.colours.length ? "all" : "some";
}

/**
 * The model checkbox: take the whole group, or drop it.
 *
 * It acts on `group.colours` — the colours currently *displayed*, already
 * narrowed by the search and the offline filter — and never on the model's full
 * colour set. That is what lets the row label promise a count the click honours
 * the owner must never click a row saying 4 and receive 26.
 *
 * A bulk-add is a snapshot, not a membership rule. The colours land as ordinary
 * picks and can be reordered or removed one by one afterwards; a colour added to
 * the model later does not join the Collection (ADR-0006).
 */
export function toggleGroup(
  items: CatalogEntry[],
  group: ModelGroup,
  pickedIds: Set<string>,
): CatalogEntry[] {
  if (groupSelection(group, pickedIds) === "all") {
    const displayed = new Set(group.colours.map((c) => c.shoeId));
    return items.filter((i) => !displayed.has(i.shoeId));
  }
  const additions = group.colours.filter((c) => !pickedIds.has(c.shoeId));
  return [...items, ...additions];
}

/**
 * Where a pick is being sent. `top` / `bottom` exist because a bulk-add of the
 * largest model drops 26 rows into the list, where one arrow at a time costs 25
 * clicks; drag-and-drop was offered and declined, and the Collections grid
 * reorders with arrows too.
 */
export type Move = "up" | "down" | "top" | "bottom";

/** Reorders one pick. A move that would run off either end is a no-op. */
export function moveItem(items: CatalogEntry[], shoeId: string, move: Move): CatalogEntry[] {
  const index = items.findIndex((i) => i.shoeId === shoeId);
  if (index === -1) return items;

  if (move === "top" || move === "bottom") {
    const atEnd = move === "top" ? index === 0 : index === items.length - 1;
    if (atEnd) return items;
    const rest = items.filter((_, i) => i !== index);
    return move === "top" ? [items[index], ...rest] : [...rest, items[index]];
  }

  const swapIndex = index + (move === "up" ? -1 : 1);
  if (swapIndex < 0 || swapIndex >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
  return reordered;
}

/** The editable text fields, as the inputs hold them: strings, never null. */
export type EditorForm = {
  title: string;
  subtitle: string;
  imageAlt: string;
  slug: string;
};

/**
 * What the server last confirmed. Dirty is measured against this and Discard
 * restores from it. The image is deliberately absent: it saves on upload and is
 * never part of the dirty state.
 */
export type EditorBaseline = {
  title: string;
  subtitle: string | null;
  imageAlt: string | null;
  slug: string;
  shoeIds: string[];
};

/**
 * `trim() || null` — how an optional field is normalised on its way to the
 * PATCH body. Exported because `save()` has to send exactly what `fieldsDirty`
 * compared against: two copies of this rule would let the save bar disagree
 * with the request it fires.
 */
export const optionalField = (value: string) => value.trim() || null;

/**
 * Compared after normalisation rather than raw, so retyping a field back to what
 * it was — or adding trailing whitespace the save would drop — leaves the page
 * clean and the save bar down.
 */
export function fieldsDirty(
  form: EditorForm,
  baseline: EditorBaseline,
  slugUnlocked: boolean,
): boolean {
  return (
    form.title.trim() !== baseline.title ||
    optionalField(form.subtitle) !== baseline.subtitle ||
    optionalField(form.imageAlt) !== baseline.imageAlt ||
    // A locked slug is never sent, so it can never be dirty.
    (slugUnlocked && form.slug.trim() !== baseline.slug)
  );
}

/** Order-sensitive: a reorder is a change, because sortOrder is what renders. */
export function itemsDirty(items: CatalogEntry[], baselineShoeIds: string[]): boolean {
  if (items.length !== baselineShoeIds.length) return true;
  return items.some((item, index) => item.shoeId !== baselineShoeIds[index]);
}

/**
 * Whether this Collection actually reaches the storefront, using ADR-0006's
 * three not-showing states — Incomplete, Hidden and Empty are glossary terms
 * (CONTEXT.md) and are deliberately not merged into one flag.
 *
 * `imageUrl` and `isVisible` come from saved state; neither is editable here.
 * The live-pick count comes from the *current local* picks, so the banner moves
 * as you tick rather than reporting last save's answer.
 */
export type StorefrontStatus = "incomplete" | "hidden" | "empty" | "live";

export function storefrontStatus({
  imageUrl,
  isVisible,
  items,
}: {
  imageUrl: string | null;
  isVisible: boolean;
  items: CatalogEntry[];
}): StorefrontStatus {
  // Precedence, not a set: the card *is* the image, so a missing one is the
  // first thing to fix and reporting anything else first would misdirect.
  if (!imageUrl) return "incomplete";
  if (!isVisible) return "hidden";
  if (!items.some((i) => i.isLive)) return "empty";
  return "live";
}
