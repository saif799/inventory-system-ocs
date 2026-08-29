"use client";

import { useState } from "react";
import { toast } from "sonner";
import AdminPage from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploader, type UploadedObject } from "@/components/ui/image-uploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { collectionSlug } from "@/lib/storefront/slug";
import { ArrowUp, ArrowDown, ImageOff, Trash2, Plus, X, Unlock } from "lucide-react";

export type CatalogEntry = {
  shoeId: string;
  modelName: string;
  color: string;
  primaryImageUrl: string | null;
  isLive: boolean;
};

export type CollectionWithItems = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  imageKey: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  sortOrder: number;
  isVisible: boolean;
  items: CatalogEntry[];
};

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

/**
 * The admin grid deliberately mirrors the storefront's: same square image, same
 * two-then-three columns. A Collection is merchandised by its picture, so the
 * page where it is edited should show the owner what a visitor will see rather
 * than a stack of accordions with the image hidden inside them.
 *
 * Editing happens in a Sheet, one Collection at a time — the picker, the
 * reorder list and the uploader are too much to inline into a tile.
 */
export default function CollectionsAdminClient({
  collections: initialCollections,
  catalog,
}: {
  collections: CollectionWithItems[];
  catalog: CatalogEntry[];
}) {
  const [collections, setCollections] = useState(initialCollections);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CollectionWithItems | null>(null);

  const editing = collections.find((c) => c.id === editingId) ?? null;

  const patchCollection = (id: string, patch: Partial<CollectionWithItems>) =>
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const createCollection = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setCollections((prev) => [...prev, { ...created, items: [] }]);
      setNewTitle("");
      // Straight into the editor: a Collection is not usable until it has an
      // image, so creation is only ever step one.
      setEditingId(created.id);
      toast.success("Collection créée");
    } catch {
      toast.error("Échec de la création");
    } finally {
      setCreating(false);
    }
  };

  const deleteCollection = async (collection: CollectionWithItems) => {
    try {
      const res = await fetch(`/api/admin/collections/${collection.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
      if (editingId === collection.id) setEditingId(null);
      toast.success("Collection supprimée");
    } catch {
      toast.error("Échec de la suppression");
    } finally {
      setPendingDelete(null);
    }
  };

  const toggleVisible = async (id: string, isVisible: boolean) => {
    patchCollection(id, { isVisible });
    try {
      await patchJson(`/api/admin/collections/${id}`, { isVisible });
    } catch {
      // Put the checkbox back: a toast the owner scrolls past would otherwise
      // leave the grid claiming a visibility the DB never accepted.
      patchCollection(id, { isVisible: !isVisible });
      toast.error("Échec de la mise à jour");
    }
  };

  const moveCollection = async (id: string, direction: -1 | 1) => {
    const index = collections.findIndex((c) => c.id === id);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= collections.length) return;

    const before = collections;
    const reordered = [...collections];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setCollections(reordered);

    try {
      await patchJson("/api/admin/collections", {
        order: reordered.map((c, i) => ({ id: c.id, sortOrder: i })),
      });
    } catch {
      setCollections(before);
      toast.error("Échec de la réorganisation");
    }
  };

  const saveItems = async (collectionId: string, items: CatalogEntry[]) => {
    const before = collections.find((c) => c.id === collectionId)?.items ?? [];
    patchCollection(collectionId, { items });
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shoeIds: items.map((i) => i.shoeId) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      patchCollection(collectionId, { items: before });
      toast.error("Échec de l'enregistrement des produits");
    }
  };

  return (
    <AdminPage
      title="Collections"
      description="Curated sets of products. Each one has its own page on the storefront, and the homepage is the grid of them."
      actions={
        <div className="flex gap-2">
          <Input
            placeholder="New collection title (e.g. Ja Morant)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createCollection()}
            className="w-56"
          />
          <Button onClick={createCollection} disabled={creating || !newTitle.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      }
    >
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No collections yet. The storefront homepage is empty until there is at least one visible
          collection with an image and a live product.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {collections.map((collection, index) => (
            <CollectionTile
              key={collection.id}
              collection={collection}
              isFirst={index === 0}
              isLast={index === collections.length - 1}
              onOpen={() => setEditingId(collection.id)}
              onToggleVisible={(v) => toggleVisible(collection.id, v)}
              onMove={(direction) => moveCollection(collection.id, direction)}
              onDelete={() => setPendingDelete(collection)}
            />
          ))}
        </div>
      )}

      <CollectionEditor
        collection={editing}
        catalog={catalog}
        onClose={() => setEditingId(null)}
        onPatch={patchCollection}
        onSaveItems={saveItems}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {pendingDelete?.title} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. La page /collection/{pendingDelete?.slug} ne répondra
              plus, et l&apos;image de la collection sera supprimée. Les produits eux-mêmes ne sont
              pas touchés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteCollection(pendingDelete)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}

/** One card in the grid: the real image, the title, the count, and the controls. */
function CollectionTile({
  collection,
  isFirst,
  isLast,
  onOpen,
  onToggleVisible,
  onMove,
  onDelete,
}: {
  collection: CollectionWithItems;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onToggleVisible: (isVisible: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onOpen}
        className="group relative block aspect-square w-full overflow-hidden rounded-md border bg-muted text-left"
      >
        {collection.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.imageUrl}
            alt={collection.imageAlt ?? collection.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <span className="text-xs">no image</span>
          </div>
        )}
        {!collection.imageUrl && (
          // Incomplete: it never reaches the storefront until this is fixed.
          <Badge variant="destructive" className="absolute left-2 top-2">
            needs image
          </Badge>
        )}
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full truncate text-left font-medium hover:underline"
        >
          {collection.title}
        </button>
        <p className="text-xs text-muted-foreground">
          {collection.items.length} produit{collection.items.length === 1 ? "" : "s"} · /
          {collection.slug}
        </p>
      </div>

      <div className="flex items-center justify-between gap-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={collection.isVisible}
            onCheckedChange={(v) => onToggleVisible(v === true)}
          />
          Visible
        </label>
        <div className="flex items-center">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            disabled={isLast}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-500"
            onClick={onDelete}
            aria-label="Delete collection"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The editor panel. Everything about one Collection lives here: its image, its
 * copy, its slug, and its picks.
 */
function CollectionEditor({
  collection,
  catalog,
  onClose,
  onPatch,
  onSaveItems,
}: {
  collection: CollectionWithItems | null;
  catalog: CatalogEntry[];
  onClose: () => void;
  onPatch: (id: string, patch: Partial<CollectionWithItems>) => void;
  onSaveItems: (collectionId: string, items: CatalogEntry[]) => void;
}) {
  return (
    <Sheet open={collection !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {collection && (
          <CollectionEditorBody
            // Remounts on switching collections, so the draft state below never
            // leaks from one Collection into the next.
            key={collection.id}
            collection={collection}
            catalog={catalog}
            onClose={onClose}
            onPatch={onPatch}
            onSaveItems={onSaveItems}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CollectionEditorBody({
  collection,
  catalog,
  onClose,
  onPatch,
  onSaveItems,
}: {
  collection: CollectionWithItems;
  catalog: CatalogEntry[];
  onClose: () => void;
  onPatch: (id: string, patch: Partial<CollectionWithItems>) => void;
  onSaveItems: (collectionId: string, items: CatalogEntry[]) => void;
}) {
  const [form, setForm] = useState({
    title: collection.title,
    subtitle: collection.subtitle ?? "",
    imageAlt: collection.imageAlt ?? "",
    slug: collection.slug,
  });
  // The slug is public API: locked by default, and unlocking is a decision the
  // owner has to make on purpose (ADR-0006).
  const [slugUnlocked, setSlugUnlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await patchJson(`/api/admin/collections/${collection.id}`, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        imageAlt: form.imageAlt.trim() || null,
        // Renaming the title must never touch the slug — it only travels when
        // it was deliberately unlocked.
        ...(slugUnlocked ? { slug: form.slug.trim() } : {}),
      });
      onPatch(collection.id, {
        title: updated.title,
        subtitle: updated.subtitle,
        imageAlt: updated.imageAlt,
        slug: updated.slug,
      });
      toast.success("Collection mise à jour");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Échec de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  /** The uploaded R2 key is what gets stored; the API derives the URL from it. */
  const setImage = async (objects: UploadedObject[]) => {
    const uploaded = objects[0];
    if (!uploaded) return;
    try {
      const updated = await patchJson(`/api/admin/collections/${collection.id}`, {
        imageKey: uploaded.key,
      });
      onPatch(collection.id, { imageKey: updated.imageKey, imageUrl: updated.imageUrl });
      toast.success("Image mise à jour");
    } catch {
      toast.error("Échec de la mise à jour de l'image");
    }
  };

  const clearImage = async () => {
    try {
      const updated = await patchJson(`/api/admin/collections/${collection.id}`, {
        imageKey: null,
      });
      onPatch(collection.id, { imageKey: updated.imageKey, imageUrl: updated.imageUrl });
      toast.success("Image supprimée");
    } catch {
      toast.error("Échec de la suppression de l'image");
    }
  };

  const addItem = (entry: CatalogEntry) => {
    if (collection.items.some((i) => i.shoeId === entry.shoeId)) return;
    onSaveItems(collection.id, [...collection.items, entry]);
  };

  const removeItem = (shoeId: string) => {
    onSaveItems(
      collection.id,
      collection.items.filter((i) => i.shoeId !== shoeId),
    );
  };

  const moveItem = (shoeId: string, direction: -1 | 1) => {
    const index = collection.items.findIndex((i) => i.shoeId === shoeId);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= collection.items.length) return;
    const reordered = [...collection.items];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    onSaveItems(collection.id, reordered);
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{collection.title}</SheetTitle>
        <SheetDescription>/collection/{collection.slug}</SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-4">
        <div className="space-y-2">
          <Label>Image</Label>
          {collection.imageUrl && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={collection.imageUrl}
                alt={collection.imageAlt ?? collection.title}
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
              that path unreachable and orphan the object on an abandoned edit. */}
          <ImageUploader
            key={collection.imageKey ?? "empty"}
            folder={`collections/${collection.id}`}
            onUploadObjects={setImage}
          />
          <p className="text-xs text-muted-foreground">
            Shown as a square on the homepage — the only place a collection image appears. Without
            it the collection never reaches the storefront.
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
                <Unlock className="h-3.5 w-3.5" /> changer l&apos;URL
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {slugUnlocked
              ? "⚠️ Changer l'URL casse tous les liens déjà partagés vers cette collection (bio Instagram, stories). L'ancienne adresse renverra une erreur 404."
              : "Fixée à la création. Renommer le titre ne la change pas."}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Products ({collection.items.length})</Label>
            <ProductPicker catalog={catalog} onSelect={addItem} />
          </div>

          {collection.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products picked yet.</p>
          ) : (
            <div className="space-y-2">
              {collection.items.map((item, index) => (
                <div
                  key={item.shoeId}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.modelName} — {item.color}
                  </span>
                  {!item.isLive && (
                    <Badge variant="destructive" className="shrink-0">
                      hors ligne
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    disabled={index === 0}
                    onClick={() => moveItem(item.shoeId, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    disabled={index === collection.items.length - 1}
                    onClick={() => moveItem(item.shoeId, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500"
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
      </div>

      <SheetFooter>
        <Button onClick={save} disabled={saving || !form.title.trim()}>
          Enregistrer
        </Button>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </SheetFooter>
    </>
  );
}

function ProductPicker({
  catalog,
  onSelect,
}: {
  catalog: CatalogEntry[];
  onSelect: (entry: CatalogEntry) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Search model or colour…" />
          <CommandList>
            <CommandGroup>
              {catalog.map((entry) => (
                <CommandItem
                  key={entry.shoeId}
                  value={`${entry.modelName} ${entry.color}`}
                  onSelect={() => {
                    onSelect(entry);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">
                    {entry.modelName} — {entry.color}
                  </span>
                  {!entry.isLive && (
                    <Badge variant="destructive" className="ml-auto shrink-0">
                      hors ligne
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
