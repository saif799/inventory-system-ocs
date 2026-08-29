"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import AdminPage from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Edit2,
  Save,
  X,
  ImageOff,
  CircleAlert,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedSearchParam, useUrlParams } from "@/lib/hooks/useUrlParams";
import ProductsFilterBar from "./ProductsFilterBar";
import {
  DEFAULT_FILTERS,
  clearedFilters,
  countVariants,
  filterModels,
  isFiltered,
  parseFilters,
  serializeFilters,
  type ProductFilters,
} from "./params";
import type { ModelRow } from "./types";

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

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setParams } = useUrlParams();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const hasActiveFilters = isFiltered(filters);

  // `models` is a prop, and this component never unmounts, so seeding state
  // once would make router.refresh() a no-op after an archive elsewhere.
  useEffect(() => setModelList(models), [models]);

  const [search, setSearch] = useDebouncedSearchParam("q", filters.q);

  const applyFilters = (patch: Partial<ProductFilters>) => {
    if ("q" in patch) setSearch(patch.q ?? "");
    setParams(serializeFilters(patch));
  };

  const clearFilters = () => {
    setSearch("");
    setParams(clearedFilters());
  };

  /**
   * The banners count every live variant regardless of stock, so the click has
   * to reset stock as well — otherwise the banner says 8 and the list shows 3.
   */
  const applyBanner = (patch: Partial<ProductFilters>) =>
    applyFilters({ ...patch, stock: "all", archived: "active", q: "" });

  const visibleModels = useMemo(
    () => filterModels(modelList, filters),
    [modelList, filters],
  );
  const visibleCount = countVariants(visibleModels);
  // The denominator is everything the current archived scope admits, so
  // "12 of 84" always compares like with like.
  const totalCount = useMemo(
    () =>
      countVariants(
        filterModels(modelList, {
          ...DEFAULT_FILTERS,
          stock: "all",
          archived: filters.archived,
        }),
      ),
    [modelList, filters.archived],
  );

  // Cards are collapsed until something is filtered, when every match opens.
  // A manual toggle overrides that, and the overrides reset when the
  // filtered/unfiltered state flips so the two never disagree for long.
  const [expandOverrides, setExpandOverrides] = useState<Record<string, boolean>>({});
  useEffect(() => setExpandOverrides({}), [hasActiveFilters]);
  const isExpanded = (modelId: string) => expandOverrides[modelId] ?? hasActiveFilters;
  const toggleExpanded = (modelId: string) =>
    setExpandOverrides((prev) => ({
      ...prev,
      [modelId]: !(prev[modelId] ?? hasActiveFilters),
    }));

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
    router.refresh();
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
    router.refresh();
  };

  const archivedCount =
    modelList.filter((m) => m.archived).length +
    modelList.reduce((sum, m) => sum + m.variants.filter((v) => v.archived).length, 0);

  return (
    <AdminPage
      title="Products & Pricing"
      description={
        <>
          Prices resolve model → colour override → size override. Set a model&apos;s price to
          price every colour that doesn&apos;t have its own override.
        </>
      }
    >
      <div className="space-y-6">
        {(unpricedCount > 0 || unphotographedCount > 0) && (
          <div className="flex flex-wrap gap-3">
            {unpricedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  applyBanner({ price: filters.price === "unpriced" ? "all" : "unpriced" })
                }
                className={cn(
                  "flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 transition-colors hover:bg-amber-500/20",
                  filters.price === "unpriced" && "ring-2 ring-amber-500/50",
                )}
              >
                <CircleAlert className="h-4 w-4 shrink-0" />
                {unpricedCount} product{unpricedCount === 1 ? "" : "s"} have no price — hidden from
                the storefront.
              </button>
            )}
            {unphotographedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  applyBanner({ images: filters.images === "without" ? "all" : "without" })
                }
                className={cn(
                  "border-border bg-muted text-muted-foreground hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  filters.images === "without" && "ring-ring/50 ring-2",
                )}
              >
                <ImageOff className="h-4 w-4 shrink-0" />
                {unphotographedCount} product{unphotographedCount === 1 ? "" : "s"} have no images.
              </button>
            )}
          </div>
        )}

        <ProductsFilterBar
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onChange={applyFilters}
          onClear={clearFilters}
          showClear={hasActiveFilters}
          resultLabel={`${visibleCount} of ${totalCount} products`}
          archivedCount={archivedCount}
        />

        <div className="space-y-4">
          {visibleModels.length === 0 && (
            <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
              No products match these filters.
              <Button size="sm" variant="ghost" className="ml-2 h-7" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
          {visibleModels.map((model) => {
            const isEditing = editingModelId === model.modelId;
            // Already scoped and filtered by filterModels — the summary below
            // counts these, so it can never contradict the rows it heads.
            const variants = model.variants;
            const expanded = isExpanded(model.modelId);
            const unpriced = variants.filter((v) => !v.hasPrice).length;
            const unphotographed = variants.filter((v) => v.imageCount === 0).length;
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
                    <button
                      type="button"
                      onClick={() => toggleExpanded(model.modelId)}
                      aria-expanded={expanded}
                      className="flex flex-1 items-center gap-2 text-left font-semibold"
                    >
                      {expanded ? (
                        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                      )}
                      {model.modelName}
                      {model.archived && (
                        <Badge variant="outline" className="text-muted-foreground">
                          archivé
                        </Badge>
                      )}
                      {/* Only while collapsed: expanded, it would just restate
                          the rows immediately beneath it. */}
                      {!expanded && (
                        <span className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
                          {variants.length} colour{variants.length === 1 ? "" : "s"}
                          {unpriced > 0 && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/40 text-amber-600"
                            >
                              {unpriced} sans prix
                            </Badge>
                          )}
                          {unphotographed > 0 && (
                            <Badge variant="outline" className="text-muted-foreground">
                              {unphotographed} sans image
                            </Badge>
                          )}
                        </span>
                      )}
                    </button>
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

                <div className={cn("divide-y", !expanded && "hidden")}>
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
    </AdminPage>
  );
}
