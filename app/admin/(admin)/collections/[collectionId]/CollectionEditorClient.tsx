"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminPage from "@/components/admin/AdminPage";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploader, type UploadedObject } from "@/components/ui/image-uploader";
import { collectionSlug } from "@/lib/storefront/slug";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ImageOff,
  Search,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import {
  buildGroups,
  fieldsDirty,
  groupSelection,
  itemsDirty,
  moveItem,
  optionalField,
  storefrontStatus,
  toggleGroup,
  type EditorBaseline,
  type EditorForm,
  type ModelGroup,
  type Move,
  type StorefrontStatus,
} from "./picker";
import type { CatalogEntry, CollectionWithItems } from "../types";

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Request failed");
  }
  return res.json();
}

/** Above this the list is sliced — the owner is expected to type instead. */
const MAX_ROWS = 300;

const WARNING_TONE = "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";

/**
 * What the banner says for each of ADR-0006's not-showing states. Takes the
 * slug because Empty has to name the address it is promising still resolves —
 * "its URL" is the one thing that line cannot leave abstract.
 */
const statusCopy = (
  slug: string,
): Record<Exclude<StorefrontStatus, "live">, { label: string; body: string; tone: string }> => ({
  incomplete: {
    label: "Incomplete",
    body: "Not on the homepage — this collection has no image. The card is the image.",
    tone: WARNING_TONE,
  },
  hidden: {
    label: "Hidden",
    body: "Switched off. Its URL returns 404.",
    tone: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
  empty: {
    label: "Empty",
    body:
      "Nothing live — every pick is unpriced or sold out. The card drops off the homepage, " +
      `but /collection/${slug} still resolves.`,
    tone: WARNING_TONE,
  },
});

/**
 * The whole editor for one Collection, on its own route.
 *
 * The picker is rendered *inline*, not in a Popover or a Dialog. Both of those
 * portal outside the element they belong to, and while this editor lived in a
 * Sheet that put them outside the Sheet's focus trap — which is module-level
 * state in Radix, so the trap kept pulling focus back and the search box could
 * never be typed into. Nothing here overlays anything, so there is no trap and
 * no stacking to get wrong. Keep it that way.
 *
 * Nothing autosaves any more except the image (see `uploadImage`). Every other
 * edit accumulates against `baseline` and leaves in one Save.
 */
export default function CollectionEditorClient({
  collection,
  catalog,
}: {
  collection: CollectionWithItems;
  catalog: CatalogEntry[];
}) {
  const router = useRouter();

  // What the server last confirmed. Dirty is measured against it and Discard
  // restores from it. The image is absent on purpose — it saves on upload.
  const [baseline, setBaseline] = useState<EditorBaseline>({
    title: collection.title,
    subtitle: collection.subtitle,
    imageAlt: collection.imageAlt,
    slug: collection.slug,
    shoeIds: collection.items.map((i) => i.shoeId),
  });
  const [form, setForm] = useState<EditorForm>({
    title: collection.title,
    subtitle: collection.subtitle ?? "",
    imageAlt: collection.imageAlt ?? "",
    slug: collection.slug,
  });
  const [items, setItems] = useState<CatalogEntry[]>(collection.items);
  const [image, setImage] = useState({
    imageKey: collection.imageKey,
    imageUrl: collection.imageUrl,
  });
  // The slug is public API: locked by default, and unlocking is a decision the
  // owner has to make on purpose (ADR-0006).
  const [slugUnlocked, setSlugUnlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [hideOffline, setHideOffline] = useState(false);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [discardOpen, setDiscardOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const pickedIds = useMemo(() => new Set(items.map((i) => i.shoeId)), [items]);

  /**
   * Every entry the pick list can ever hold, for restoring order from
   * `baseline.shoeIds` on Discard. A pick whose product no longer resolves is
   * only ever in `collection.items`, never in the catalog.
   */
  const entriesById = useMemo(
    () => new Map([...catalog, ...collection.items].map((e) => [e.shoeId, e])),
    [catalog, collection.items],
  );

  const groups = useMemo(
    () => buildGroups(catalog, { query, hideOffline }),
    [catalog, query, hideOffline],
  );
  const visibleGroups = groups.slice(0, MAX_ROWS);

  const dirtyFields = fieldsDirty(form, baseline, slugUnlocked);
  const dirtyItems = itemsDirty(items, baseline.shoeIds);
  const isDirty = dirtyFields || dirtyItems;
  const dirtyHalves = [dirtyFields && "details", dirtyItems && "products"].filter(
    Boolean,
  ) as string[];

  const copy = statusCopy(baseline.slug);
  const status = storefrontStatus({
    // Saved state — neither is editable here …
    imageUrl: image.imageUrl,
    isVisible: collection.isVisible,
    // … but the live-pick count is local, so the banner moves as you tick
    // rather than reporting the last save's answer.
    items,
  });

  // Starting a search opens the matching groups, so the results are the colours
  // themselves rather than a wall of collapsed rows; clearing it collapses them
  // again. Only the transition acts, which leaves the chevron working normally
  // either side of it and lets expansion survive further typing.
  const wasSearching = useRef(false);
  useEffect(() => {
    const searching = query.trim().length > 0;
    if (searching === wasSearching.current) return;
    wasSearching.current = searching;
    setExpandedModels(searching ? new Set(groups.map((g) => g.modelId)) : new Set());
  }, [query, groups]);

  // Covers tab close and reload. The App Router has no supported way to
  // intercept a sidebar navigation, so AdminSidebar links stay a hole: the back
  // link below confirms on the intended exit and that is as far as this goes.
  // Do not add global navigation-blocking state to close it.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Both toggles read the picked set out of the updater's own `current` rather
  // than the render's `pickedIds`, so what a click adds or removes is decided
  // against the list it is actually being applied to.
  const toggleColour = (entry: CatalogEntry) =>
    setItems((current) =>
      current.some((i) => i.shoeId === entry.shoeId)
        ? current.filter((i) => i.shoeId !== entry.shoeId)
        : [...current, entry],
    );

  const onToggleGroup = (group: ModelGroup) =>
    setItems((current) => toggleGroup(current, group, new Set(current.map((i) => i.shoeId))));

  const removeItem = (shoeId: string) =>
    setItems((current) => current.filter((i) => i.shoeId !== shoeId));

  const onMove = (shoeId: string, move: Move) =>
    setItems((current) => moveItem(current, shoeId, move));

  const toggleExpanded = (modelId: string) =>
    setExpandedModels((current) => {
      const next = new Set(current);
      if (!next.delete(modelId)) next.add(modelId);
      return next;
    });

  /**
   * One save, only the dirty halves, in order.
   *
   * `committed` accumulates what actually landed, so a PUT that fails after a
   * successful PATCH commits the details half and leaves the products half
   * dirty — the bar stays up showing only what is still unsaved, and nothing
   * that succeeded is rolled back.
   *
   * No `router.refresh()`: the server has just confirmed local state, and
   * re-querying the whole catalog would produce exactly the visible re-render
   * this batching exists to remove. The route handlers' `revalidatePath` still
   * updates the storefront and the collections grid for the next visit.
   */
  const save = async () => {
    setSaving(true);
    let committed = baseline;
    let stage: "details" | "products" = "details";
    try {
      if (dirtyFields) {
        const updated = await patchJson(`/api/admin/collections/${collection.id}`, {
          title: form.title.trim(),
          subtitle: optionalField(form.subtitle),
          imageAlt: optionalField(form.imageAlt),
          // Renaming the title must never touch the slug — it only travels when
          // it was deliberately unlocked.
          ...(slugUnlocked ? { slug: form.slug.trim() } : {}),
        });
        committed = {
          ...committed,
          title: updated.title,
          subtitle: updated.subtitle,
          imageAlt: updated.imageAlt,
          slug: updated.slug,
        };
        // The API slugifies what it is sent, so show what it actually stored.
        setForm((f) => ({ ...f, slug: updated.slug }));
        // Re-locked here and not only on full success, so a PUT that fails
        // afterwards still leaves the slug locked — it did save.
        setSlugUnlocked(false);
      }

      if (dirtyItems) {
        stage = "products";
        const shoeIds = items.map((i) => i.shoeId);
        const res = await fetch(`/api/admin/collections/${collection.id}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shoeIds }),
        });
        if (!res.ok) throw new Error();
        committed = { ...committed, shoeIds };
      }

      // Covers the items-only save, where the branch above never ran and an
      // unlocked-but-unedited slug would otherwise keep its warning up.
      setSlugUnlocked(false);
      toast.success("Collection saved");
    } catch (error: any) {
      if (stage === "details") {
        toast.error(error?.message || "Could not save the details");
      } else if (dirtyFields) {
        toast.error("Details saved, but the products could not be saved");
      } else {
        toast.error("Could not save the products");
      }
    } finally {
      setBaseline(committed);
      setSaving(false);
    }
  };

  const discard = () => {
    setForm({
      title: baseline.title,
      subtitle: baseline.subtitle ?? "",
      imageAlt: baseline.imageAlt ?? "",
      slug: baseline.slug,
    });
    setItems(
      baseline.shoeIds
        .map((shoeId) => entriesById.get(shoeId))
        .filter((entry): entry is CatalogEntry => !!entry),
    );
    setSlugUnlocked(false);
  };

  /** The uploaded R2 key is what gets stored; the API derives the URL from it. */
  const uploadImage = async (objects: UploadedObject[]) => {
    const uploaded = objects[0];
    if (!uploaded) return;
    try {
      const updated = await patchJson(`/api/admin/collections/${collection.id}`, {
        imageKey: uploaded.key,
      });
      setImage({ imageKey: updated.imageKey, imageUrl: updated.imageUrl });
      toast.success("Image updated");
    } catch {
      toast.error("Could not update the image");
    }
  };

  const clearImage = async () => {
    try {
      const updated = await patchJson(`/api/admin/collections/${collection.id}`, {
        imageKey: null,
      });
      setImage({ imageKey: updated.imageKey, imageUrl: updated.imageUrl });
      toast.success("Image removed");
    } catch {
      toast.error("Could not remove the image");
    }
  };

  return (
    <>
      <AdminPage
        title={baseline.title}
        description={`/collection/${baseline.slug}`}
        // Room for the fixed save bar, so it cannot cover the last row.
        className={isDirty ? "pb-28" : undefined}
        actions={
          isDirty ? (
            <Button variant="outline" onClick={() => setLeaveOpen(true)}>
              <ArrowLeft className="h-4 w-4" /> Collections
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/admin/collections">
                <ArrowLeft className="h-4 w-4" /> Collections
              </Link>
            </Button>
          )
        }
      >
        {status !== "live" && (
          <div className={cn("mb-6 rounded-md border px-4 py-3 text-sm", copy[status].tone)}>
            <span className="font-medium">{copy[status].label}</span> — {copy[status].body}
            {status === "hidden" && (
              <>
                {" "}
                {/* A second way off the page, so it takes the same guard as the
                    back link rather than dropping unsaved work silently. */}
                {isDirty ? (
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => setLeaveOpen(true)}
                  >
                    Switch it on
                  </button>
                ) : (
                  <Link href="/admin/collections" className="underline underline-offset-2">
                    Switch it on
                  </Link>
                )}
                .
              </>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: what the Collection is */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Image</Label>
              {image.imageUrl && (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt={form.imageAlt || form.title}
                    className="aspect-square w-40 rounded-md border object-cover"
                  />
                  <Button size="sm" variant="outline" onClick={clearImage}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove image
                  </Button>
                </div>
              )}
              {/* Always rendered, image or not: uploading over an existing one is
                  how an image gets *replaced*, and the API deletes the old R2
                  object on that PATCH. Hiding it behind "remove first" would make
                  that path unreachable and orphan the object on an abandoned edit.
                  That is also why the image is the one field still saved on the
                  spot rather than batched into Save. */}
              <ImageUploader
                key={image.imageKey ?? "empty"}
                folder={`collections/${collection.id}`}
                onUploadObjects={uploadImage}
              />
              <p className="text-xs text-muted-foreground">
                Saved as soon as it uploads. Shown as a square on the homepage — the only place a
                collection image appears. Without it the collection never reaches the storefront.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection-title">Title</Label>
              <Input
                id="collection-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection-subtitle">Subtitle</Label>
              <Input
                id="collection-subtitle"
                value={form.subtitle}
                placeholder="Optional"
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection-alt">Image alt text</Label>
              <Input
                id="collection-alt"
                value={form.imageAlt}
                placeholder="Falls back to the title"
                onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection-slug">URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="collection-slug"
                  value={form.slug}
                  readOnly={!slugUnlocked}
                  // Normalised as typed: the API slugifies whatever it is sent, so
                  // showing the raw input would promise an URL it will not create.
                  onChange={(e) => setForm({ ...form, slug: collectionSlug(e.target.value) })}
                  className={slugUnlocked ? "" : "bg-muted text-muted-foreground"}
                />
                {!slugUnlocked && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setSlugUnlocked(true)}
                  >
                    <Unlock className="h-3.5 w-3.5" /> Change URL
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {slugUnlocked
                  ? "⚠️ Changing the URL breaks every link already shared to this collection (Instagram bio, stories). The old address will return a 404."
                  : "Set at creation. Renaming the title does not change it."}
              </p>
            </div>
          </div>

          {/* Right: what is in it. Picks on top, catalogue underneath — both
              visible at once, so ticking a product shows up in the order list
              without anything opening or closing. */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Selection ({items.length})</Label>

              {items.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  No products yet. Pick some from the catalog below.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.shoeId}
                      className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                    >
                      <Thumb entry={item} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {item.modelName} — {item.color}
                      </span>
                      {!item.isLive && (
                        <Badge variant="destructive" className="shrink-0">
                          offline
                        </Badge>
                      )}
                      {/* Move to top / bottom earn their place at 26 picks, where
                          one arrow at a time costs 25 clicks. */}
                      <MoveButton
                        move="top"
                        disabled={index === 0}
                        onClick={() => onMove(item.shoeId, "top")}
                      />
                      <MoveButton
                        move="up"
                        disabled={index === 0}
                        onClick={() => onMove(item.shoeId, "up")}
                      />
                      <MoveButton
                        move="down"
                        disabled={index === items.length - 1}
                        onClick={() => onMove(item.shoeId, "down")}
                      />
                      <MoveButton
                        move="bottom"
                        disabled={index === items.length - 1}
                        onClick={() => onMove(item.shoeId, "bottom")}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 p-0 text-red-500"
                        onClick={() => removeItem(item.shoeId)}
                        aria-label="Remove product"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="catalog-search">Catalog</Label>
                {/* Default off, and load-bearing: it keeps a model checkbox
                    taking every colour of the model. Turning it on narrows what
                    the box takes, which is the same rule, not an exception. */}
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={hideOffline}
                    onCheckedChange={(value) => setHideOffline(value === true)}
                  />
                  Hide offline
                </label>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="catalog-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a model or colour…"
                  className="pl-8"
                />
              </div>

              <div className="max-h-[480px] space-y-1 overflow-y-auto rounded-md border p-1">
                {visibleGroups.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No products found.
                  </p>
                ) : (
                  visibleGroups.map((group) => (
                    <GroupRow
                      key={group.modelId}
                      group={group}
                      pickedIds={pickedIds}
                      expanded={expandedModels.has(group.modelId)}
                      onToggleExpanded={() => toggleExpanded(group.modelId)}
                      onToggleGroup={() => onToggleGroup(group)}
                      onToggleColour={toggleColour}
                    />
                  ))
                )}
                {groups.length > visibleGroups.length && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    {groups.length - visibleGroups.length} more models — refine your search.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminPage>

      {/* Fixed to the bottom because AdminPage's header is not sticky: a Save
          button up there scrolls out of view the moment you are in the catalog. */}
      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
            <span className="text-sm text-muted-foreground">
              Unsaved changes: {dirtyHalves.join(", ")}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDiscardOpen(true)} disabled={saving}>
                Discard
              </Button>
              <Button onClick={save} disabled={saving || !form.title.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        description={`Your unsaved ${dirtyHalves.join(" and ")} will go back to the last saved version. The image is not affected.`}
        confirmLabel="Discard"
        destructive
        onConfirm={discard}
      />

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave without saving?"
        description={`Your unsaved ${dirtyHalves.join(" and ")} will be lost.`}
        confirmLabel="Leave"
        destructive
        onConfirm={() => router.push("/admin/collections")}
      />
    </>
  );
}

/**
 * One Shoe Model in the catalog, with its colours under it.
 *
 * A model showing a single colour renders as a plain colour row instead: with a
 * median of 3 colours per model, wrapping one item in an expander would be most
 * of the list. The checkbox means the same thing either way — take what is on
 * screen.
 */
function GroupRow({
  group,
  pickedIds,
  expanded,
  onToggleExpanded,
  onToggleGroup,
  onToggleColour,
}: {
  group: ModelGroup;
  pickedIds: Set<string>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleGroup: () => void;
  onToggleColour: (entry: CatalogEntry) => void;
}) {
  if (group.colours.length === 1) {
    const only = group.colours[0];
    return (
      <ColourRow
        entry={only}
        label={`${only.modelName} — ${only.color}`}
        checked={pickedIds.has(only.shoeId)}
        onClick={() => onToggleColour(only)}
      />
    );
  }

  const selection = groupSelection(group, pickedIds);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent",
          selection !== "none" && "bg-accent/60",
        )}
      >
        <Checkbox
          checked={selection === "all" ? true : selection === "some" ? "indeterminate" : false}
          onCheckedChange={onToggleGroup}
          aria-label={`Select the ${group.colours.length} shown colours of ${group.modelName}`}
        />
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <Thumb entry={{ primaryImageUrl: group.thumbUrl }} />
          <span className="min-w-0 flex-1 truncate text-sm">{group.modelName}</span>
          {/* The count is what the checkbox acts on — the colours *shown*, after
              the search and the offline filter, never the model's full set. */}
          <span className="shrink-0 text-xs text-muted-foreground">
            · {group.colours.length} colours
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {expanded && (
        <div className="ml-3 mt-1 space-y-1 border-l pl-4">
          {group.colours.map((entry) => (
            <ColourRow
              key={entry.shoeId}
              entry={entry}
              label={entry.color}
              checked={pickedIds.has(entry.shoeId)}
              onClick={() => onToggleColour(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ColourRow({
  entry,
  label,
  checked,
  onClick,
}: {
  entry: CatalogEntry;
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  // Not a <button>: Radix renders Checkbox.Root as a button of its own, and a
  // button inside a button is invalid DOM that React flags and that risks a
  // hydration mismatch on this server-rendered page. The row carries the
  // checkbox role itself and the box inside it is decoration — untabbable and
  // hidden from assistive tech so there is exactly one control here.
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        onClick();
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-accent",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        checked && "bg-accent/60",
      )}
    >
      <Checkbox checked={checked} className="pointer-events-none" tabIndex={-1} aria-hidden />
      <Thumb entry={entry} />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      {!entry.isLive && (
        <Badge variant="destructive" className="shrink-0">
          offline
        </Badge>
      )}
    </div>
  );
}

const MOVE_BUTTONS: Record<Move, { Icon: typeof ArrowUp; label: string }> = {
  top: { Icon: ChevronsUp, label: "Move to top" },
  up: { Icon: ArrowUp, label: "Move up" },
  down: { Icon: ArrowDown, label: "Move down" },
  bottom: { Icon: ChevronsDown, label: "Move to bottom" },
};

function MoveButton({
  move,
  disabled,
  onClick,
}: {
  move: Move;
  disabled: boolean;
  onClick: () => void;
}) {
  const { Icon, label } = MOVE_BUTTONS[move];
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 shrink-0 p-0"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

/** Square photo of a colour variant, or a placeholder when it has none. */
function Thumb({ entry }: { entry: Pick<CatalogEntry, "primaryImageUrl"> }) {
  return entry.primaryImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={entry.primaryImageUrl}
      alt=""
      className="h-10 w-10 shrink-0 rounded border object-cover"
    />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground">
      <ImageOff className="h-4 w-4" />
    </div>
  );
}
