"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, ImageOff, CircleAlert, Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";

export type VariantRow = {
  shoeId: string;
  color: string;
  priceOverride: number | null;
  compareAtPriceOverride: number | null;
  effectivePrice: number;
  imageCount: number;
  totalStock: number;
  hasPrice: boolean;
  archived: boolean;
};

export type ModelRow = {
  modelId: string;
  modelName: string;
  basePrice: number;
  compareAtPrice: number | null;
  archived: boolean;
  variants: VariantRow[];
};

export default function ProductsAdminClient({
  models,
  unpricedCount,
  unphotographedCount,
}: {
  models: ModelRow[];
  unpricedCount: number;
  unphotographedCount: number;
}) {
  const [modelList, setModelList] = useState(models);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    modelName: string;
    basePrice: string;
    compareAtPrice: string;
  }>({
    modelName: "",
    basePrice: "",
    compareAtPrice: "",
  });
  const [saving, setSaving] = useState(false);
  // Archived rows are hidden by default, so this toggle is the only way back
  // to un-archive one.
  const [showArchived, setShowArchived] = useState(false);

  const startEdit = (model: ModelRow) => {
    setEditingModelId(model.modelId);
    setEditForm({
      modelName: model.modelName,
      basePrice: String(model.basePrice),
      compareAtPrice: model.compareAtPrice != null ? String(model.compareAtPrice) : "",
    });
  };

  const cancelEdit = () => setEditingModelId(null);

  const saveEdit = async (modelId: string) => {
    setSaving(true);
    try {
      const modelName = editForm.modelName.trim();
      if (!modelName) {
        toast.error("Model name cannot be empty");
        return;
      }
      const basePrice = Number(editForm.basePrice) || 0;
      const compareAtPrice = editForm.compareAtPrice ? Number(editForm.compareAtPrice) : null;

      const res = await fetch(`/api/admin/models/${modelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelName, basePrice, compareAtPrice }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Failed to save model");
        return;
      }

      setModelList((prev) =>
        prev.map((m) =>
          m.modelId === modelId
            ? {
                ...m,
                modelName,
                basePrice,
                compareAtPrice,
                variants: m.variants.map((v) => ({
                  ...v,
                  effectivePrice: v.priceOverride ?? basePrice,
                  hasPrice: (v.priceOverride ?? basePrice) > 0,
                })),
              }
            : m,
        ),
      );
      toast.success("Model saved");
      setEditingModelId(null);
    } finally {
      setSaving(false);
    }
  };

  const setModelArchived = async (modelId: string, archived: boolean) => {
    const res = await fetch(`/api/admin/models/${modelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Failed to update model");
      return;
    }
    setModelList((prev) =>
      prev.map((m) => (m.modelId === modelId ? { ...m, archived } : m)),
    );
    toast.success(archived ? "Model archived" : "Model restored");
  };

  const setVariantArchived = async (shoeId: string, archived: boolean) => {
    const res = await fetch(`/api/admin/products/${shoeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Failed to update product");
      return;
    }
    setModelList((prev) =>
      prev.map((m) => ({
        ...m,
        variants: m.variants.map((v) => (v.shoeId === shoeId ? { ...v, archived } : v)),
      })),
    );
    toast.success(archived ? "Product archived" : "Product restored");
  };

  const archivedCount =
    modelList.filter((m) => m.archived).length +
    modelList.reduce((sum, m) => sum + m.variants.filter((v) => v.archived).length, 0);

  const visibleModels = showArchived
    ? modelList
    : modelList.filter((m) => !m.archived);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products & Pricing</h1>
        <p className="text-muted-foreground mt-1">
          Prices resolve model → colour override → size override. Set a model&apos;s price to
          price every colour that doesn&apos;t have its own override.
        </p>
      </div>

      {(unpricedCount > 0 || unphotographedCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {unpricedCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
              <CircleAlert className="h-4 w-4 shrink-0" />
              {unpricedCount} product{unpricedCount === 1 ? "" : "s"} have no price — hidden from
              the storefront.
            </div>
          )}
          {unphotographedCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <ImageOff className="h-4 w-4 shrink-0" />
              {unphotographedCount} product{unphotographedCount === 1 ? "" : "s"} have no images.
            </div>
          )}
        </div>
      )}

      {archivedCount > 0 && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 accent-current"
          />
          Show archived ({archivedCount})
        </label>
      )}

      <div className="space-y-4">
        {visibleModels.map((model) => {
          const isEditing = editingModelId === model.modelId;
          const variants = showArchived
            ? model.variants
            : model.variants.filter((v) => !v.archived);
          return (
            <div
              key={model.modelId}
              className={cn("rounded-lg border", model.archived && "opacity-60")}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                {isEditing ? (
                  <Input
                    value={editForm.modelName}
                    onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })}
                    className="h-8 w-56 font-semibold"
                  />
                ) : (
                  <div className="flex items-center gap-2 font-semibold">
                    {model.modelName}
                    {model.archived && (
                      <Badge variant="outline" className="text-muted-foreground">
                        archivé
                      </Badge>
                    )}
                  </div>
                )}

                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Prix</span>
                      <Input
                        type="number"
                        min={0}
                        value={editForm.basePrice}
                        onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                        className="h-8 w-24"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Compare-at</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="—"
                        value={editForm.compareAtPrice}
                        onChange={(e) =>
                          setEditForm({ ...editForm, compareAtPrice: e.target.value })
                        }
                        className="h-8 w-24"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-green-500 hover:text-green-400"
                      onClick={() => saveEdit(model.modelId)}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground"
                      onClick={cancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {model.basePrice} DA
                      {model.compareAtPrice != null && (
                        <span className="ml-2 text-xs text-muted-foreground line-through">
                          {model.compareAtPrice} DA
                        </span>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(model)}
                      title="Rename / edit price"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setModelArchived(model.modelId, !model.archived)}
                      title={model.archived ? "Restore model" : "Archive model"}
                    >
                      {model.archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="divide-y">
                {variants.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No colour variants yet.
                  </div>
                ) : (
                  variants.map((v) => (
                    <div
                      key={v.shoeId}
                      className={cn(
                        "flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-accent/50",
                        v.archived && "opacity-60",
                      )}
                    >
                      <Link
                        href={`/admin/products/${v.shoeId}/edit`}
                        className="flex flex-1 flex-wrap items-center gap-3"
                      >
                        <span className="min-w-[100px] font-medium">{v.color}</span>
                        <span
                          className={cn(
                            "min-w-[90px]",
                            !v.hasPrice && "text-amber-600 font-medium",
                          )}
                        >
                          {v.effectivePrice} DA
                          {v.priceOverride != null && (
                            <span className="ml-1 text-xs text-muted-foreground">(override)</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">Stock: {v.totalStock}</span>
                        <span className="text-muted-foreground">
                          {v.imageCount} image{v.imageCount === 1 ? "" : "s"}
                        </span>
                        <div className="ml-auto flex gap-2">
                          {v.archived && (
                            <Badge variant="outline" className="text-muted-foreground">
                              archivé
                            </Badge>
                          )}
                          {!v.hasPrice && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                              sans prix
                            </Badge>
                          )}
                          {v.imageCount === 0 && (
                            <Badge variant="outline" className="text-muted-foreground">
                              sans image
                            </Badge>
                          )}
                        </div>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setVariantArchived(v.shoeId, !v.archived)}
                        title={v.archived ? "Restore product" : "Archive product"}
                      >
                        {v.archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
