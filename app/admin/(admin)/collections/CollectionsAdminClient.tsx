"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminPage from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowUp, ArrowDown, ImageOff, Trash2, Plus } from "lucide-react";
import type { CollectionSummary } from "./types";

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
 * page where it is edited should show the owner what a visitor will see.
 *
 * Editing is a *route*, not a Sheet. It used to be a right-hand Sheet with the
 * product picker nested inside it, and that nesting is what broke the picker: a
 * Sheet is a modal Radix Dialog whose focus trap lives in module-level state,
 * so an overlay opened on top of it fought it for focus and the search box
 * could not be typed into. A page has no trap to fight.
 */
export default function CollectionsAdminClient({
  collections: initialCollections,
}: {
  collections: CollectionSummary[];
}) {
  const router = useRouter();
  const [collections, setCollections] = useState(initialCollections);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CollectionSummary | null>(null);

  const patchCollection = (id: string, patch: Partial<CollectionSummary>) =>
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
      setNewTitle("");
      toast.success("Collection créée");
      // Straight into the editor: a Collection is not usable until it has an
      // image, so creation is only ever step one.
      router.push(`/admin/collections/${created.id}`);
    } catch {
      toast.error("Échec de la création");
    } finally {
      setCreating(false);
    }
  };

  const deleteCollection = async (collection: CollectionSummary) => {
    try {
      const res = await fetch(`/api/admin/collections/${collection.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
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
              onToggleVisible={(v) => toggleVisible(collection.id, v)}
              onMove={(direction) => moveCollection(collection.id, direction)}
              onDelete={() => setPendingDelete(collection)}
            />
          ))}
        </div>
      )}

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
  onToggleVisible,
  onMove,
  onDelete,
}: {
  collection: CollectionSummary;
  isFirst: boolean;
  isLast: boolean;
  onToggleVisible: (isVisible: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const href = `/admin/collections/${collection.id}`;

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={href}
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
      </Link>

      <div className="min-w-0">
        <Link href={href} className="block w-full truncate text-left font-medium hover:underline">
          {collection.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          {collection.itemCount} produit{collection.itemCount === 1 ? "" : "s"} · /{collection.slug}
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
