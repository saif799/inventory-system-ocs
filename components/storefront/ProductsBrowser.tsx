"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FilterTool, { type FilterParams } from "@/components/filterTool";
import ProductCard from "./ProductCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { SlidersHorizontal, ArrowDownUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StorefrontProduct } from "@/lib/storefront/products";

type SortOption = "nouveautes" | "prix-asc" | "prix-desc";

const FRENCH_LABELS = {
  filters: "Filtres",
  model: "Modèle",
  size: "Pointure",
  bounds: "Prix",
  minPlaceholder: "prix min",
  maxPlaceholder: "prix max",
};

/**
 * Design system §3.3 — a filter rail plus a 2/3-column product grid that
 * collapses to a bottom drawer on mobile, under a sticky sub-header that sits
 * below the fixed nav.
 */
export default function ProductsBrowser({
  initialProducts,
  models,
  sizes,
}: {
  initialProducts: StorefrontProduct[];
  models: string[];
  sizes: number[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [filterParams, setFilterParams] = useState<FilterParams>({
    models: searchParams.get("models")?.split(",").filter(Boolean) ?? [],
    sizes:
      searchParams
        .get("sizes")
        ?.split(",")
        .map((size) => parseFloat(size))
        .filter((n) => Number.isFinite(n)) ?? [],
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
    ProductName: searchParams.get("ProductName") ?? "",
  });
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get("sort") as SortOption) || "nouveautes",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const productsWithSearch = useMemo(
    () =>
      initialProducts.map((p) => ({
        ...p,
        lowerModelColor: `${p.modelName} ${p.color}`.toLowerCase(),
        sizesNum: p.sizes.map((s) => ({ ...s, sizeNum: Number(s.size) })),
      })),
    [initialProducts],
  );

  const filtered = useMemo(() => {
    return productsWithSearch.filter((p) => {
      if (filterParams.models.length > 0 && !filterParams.models.includes(p.modelName)) {
        return false;
      }

      if (
        filterParams.ProductName &&
        !p.lowerModelColor.includes(filterParams.ProductName.toLowerCase())
      ) {
        return false;
      }

      if (
        filterParams.sizes.length > 0 &&
        !p.sizesNum.some((s) => filterParams.sizes.includes(s.sizeNum) && s.quantity > 0)
      ) {
        return false;
      }

      if (filterParams.minPrice || filterParams.maxPrice) {
        const min = filterParams.minPrice ? Number(filterParams.minPrice) : 0;
        const max = filterParams.maxPrice ? Number(filterParams.maxPrice) : Infinity;
        if (!(p.minPrice >= min && p.minPrice <= max)) return false;
      }

      return true;
    });
  }, [productsWithSearch, filterParams]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "prix-asc") copy.sort((a, b) => a.minPrice - b.minPrice);
    else if (sort === "prix-desc") copy.sort((a, b) => b.minPrice - a.minPrice);
    // "nouveautes": keep the server order (already newestAt DESC).
    return copy;
  }, [filtered, sort]);

  const updateSearch = (value: string) => {
    setFilterParams((prev) => ({ ...prev, ProductName: value }));
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("ProductName", value);
    else params.delete("ProductName");
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  };

  const updateSort = (value: SortOption) => {
    setSort(value);
    const params = new URLSearchParams(window.location.search);
    if (value !== "nouveautes") params.set("sort", value);
    else params.delete("sort");
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    filterParams.models.length > 0 ||
    filterParams.sizes.length > 0 ||
    !!filterParams.minPrice ||
    !!filterParams.maxPrice;

  return (
    <div className="w-full">
      <div className="relative py-4 max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--sf-muted)"
          strokeWidth={1.5}
        />
        <Input
          defaultValue={filterParams.ProductName ?? ""}
          placeholder="Rechercher un modèle ou une couleur…"
          aria-label="Rechercher un modèle ou une couleur"
          className="h-12 w-full pl-9"
          onChange={(e) => updateSearch(e.target.value)}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-14">
        <div className="hidden lg:sticky lg:block lg:self-start" style={{ top: "calc(var(--sf-nav-offset) + 0.5rem)" }}>
          <FilterTool
            models={models}
            sizes={sizes}
            filterTool={filterParams}
            setfilterTool={setFilterParams}
            boundsMode="price"
            labels={FRENCH_LABELS}
            accentClassName="text-(--sf-accent)"
            accentHex="var(--sf-accent)"
            mutedHex="var(--sf-muted)"
            variant="storefront"
            className=""
          />
        </div>

        <div className="min-w-0">
          {/* Sticky sub-header, sitting directly under the fixed nav. */}
          <div
            className="z-50 flex w-full items-center justify-between gap-3 bg-(--sf-bg) pb-2 pt-2 lg:sticky lg:pb-4"
            style={{ top: "var(--sf-nav-offset)" }}
          >
            <h2 className="sf-heading text-left text-xl font-medium text-(--sf-text)">
              Produits ({sorted.length})
            </h2>

            <div className="flex items-center gap-1">
              <div className="hidden items-center gap-1 lg:flex">
                <Select value={sort} onValueChange={(v) => updateSort(v as SortOption)}>
                  <SelectTrigger
                    className="h-9 w-max border-none shadow-none"
                    aria-label="Trier les produits"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="sf-portal">
                    <SelectItem value="nouveautes">Nouveautés</SelectItem>
                    <SelectItem value="prix-asc">Prix croissant</SelectItem>
                    <SelectItem value="prix-desc">Prix décroissant</SelectItem>
                  </SelectContent>
                </Select>
                <ArrowDownUp className="size-4 text-(--sf-muted)" strokeWidth={1.5} />
              </div>

              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2 border border-(--sf-line) px-4 py-2 text-sm transition-colors hover:bg-(--sf-hover) lg:hidden",
                      hasActiveFilters && "font-medium text-(--sf-accent)",
                    )}
                    style={{ borderRadius: "var(--sf-radius)" }}
                  >
                    Filtres <SlidersHorizontal className="size-4" strokeWidth={1.5} />
                  </button>
                </DrawerTrigger>
                <DrawerContent className="sf-portal max-h-[90vh]">
                  <DrawerHeader>
                    <DrawerTitle className="sf-heading text-left text-xl font-medium">
                      Filtres
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="overflow-y-auto px-2 pb-4">
                    <FilterTool
                      models={models}
                      sizes={sizes}
                      filterTool={filterParams}
                      setfilterTool={setFilterParams}
                      boundsMode="price"
                      labels={FRENCH_LABELS}
                      accentClassName="text-(--sf-accent)"
                      accentHex="var(--sf-accent)"
                      mutedHex="var(--sf-muted)"
                      variant="storefront"
                      className="px-2"
                    />
                  </div>
                  <div className="p-4">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="w-full bg-(--sf-ink) py-4 text-sm font-medium text-(--sf-ink-fg) transition-opacity hover:opacity-90"
                      style={{ borderRadius: "var(--sf-radius)" }}
                    >
                      Voir les {sorted.length} résultats
                    </button>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className="sf-body py-16 text-center text-sm text-(--sf-muted)">
              Aucun produit ne correspond à ces filtres.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-10 pt-2 md:grid-cols-3 md:gap-4">
              {sorted.map((product, i) => (
                <ProductCard key={product.shoeId} product={product} priority={i < 6} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
