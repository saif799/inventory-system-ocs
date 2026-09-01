/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";
import FilterTool from "./filterTool";
import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { Button } from "./ui/button";
import { Filter, FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";

import { shoeModels } from "@/lib/schema";
import { InferSelectModel } from "drizzle-orm";

import ProductCard from "./productCard";
import { Input } from "./ui/input";
import { GroupedProduct } from "@/app/admin/(admin)/page";
import MultipleItemsOrder from "./multipleItemsOrder";
type shoe_modelsType = Array<InferSelectModel<typeof shoeModels>>;

export type shoesType = {
  id: string;
  modelId: string;
  modelName: string;
  color: string;
  quantity: number;
  size: string;
};
const sizes = [
  35.5, 36, 36.5, 37, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5,
  45, 45.5, 46, 47, 47.5, 48, 48.5, 49, 49.5, 50, 50.5, 51, 51.5,
];
export default function Listings({
  products,
  models,
  borrowerName,
}: {
  products: GroupedProduct[];
  models: shoe_modelsType;
  borrowerName?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [selectedShoes, setSelectedShoes] =
    useState<Array<{ id: string; name: string }>>();
  const [selectIsOn, setSelectIsOn] = useState<boolean>(false);

  type FilterParams = {
    models: string[];
    sizes: number[];
    minPrice?: string | null;
    maxPrice?: string | null;
    ProductName?: string;
  };

  const [filterParams, setFilterParams] = useState<FilterParams>({
    models: searchParams.get("models")?.split(",") ?? [],
    sizes:
      searchParams
        .get("sizes")
        ?.split(",")
        .map((size) => parseFloat(size)) ?? [],
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
    ProductName: searchParams.get("ProductName")?.toLowerCase(),
  });

  // One debounced writer owns the URL, and it rebuilds the whole query from
  // filterParams. The search box used to also write the URL on every keystroke,
  // which raced this effect and stripped the keys it did not know about — which
  // is also why FilterTool is mounted with syncUrl={false} below.
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams();
      if (filterParams.ProductName) {
        params.set("ProductName", filterParams.ProductName);
      }
      if (filterParams.models.length > 0) {
        params.set("models", filterParams.models.join(","));
      }
      if (filterParams.sizes.length > 0) {
        params.set("sizes", filterParams.sizes.join(","));
      }
      if (filterParams.minPrice) params.set("minPrice", filterParams.minPrice);
      if (filterParams.maxPrice) params.set("maxPrice", filterParams.maxPrice);

      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    }, 300);

    return () => clearTimeout(id);
  }, [filterParams, pathname]);

  const strModels = models.map((m) => m.modelName);

  const productsWithSearch = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        lowerModelColor: `${p.modelName} ${p.color}`.toLowerCase(),
        sizesNum: p.sizes.map((s) => ({ ...s, sizeNum: Number(s.size) })),
      })),
    [products],
  );

  const listings = productsWithSearch.filter((p) => {
    if (
      filterParams.models.length > 0 &&
      !filterParams.models.includes(p.modelName)
    ) {
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
      !p.sizesNum.some((s) => filterParams.sizes.includes(s.sizeNum))
    ) {
      return false;
    }

    if (filterParams.minPrice || filterParams.maxPrice) {
      const minQ = filterParams.minPrice ? Number(filterParams.minPrice) : 0;
      const maxQ = filterParams.maxPrice
        ? Number(filterParams.maxPrice)
        : Infinity;
      if (!p.sizesNum.some((s) => s.quantity >= minQ && s.quantity <= maxQ)) {
        return false;
      }
    }

    return true;
  });

  // Reads filterParams, not searchParams: replaceState does not feed back into
  // useSearchParams, so the URL copy goes stale the moment a filter changes.
  const hasActiveFilters =
    filterParams.models.length > 0 ||
    filterParams.sizes.length > 0 ||
    Boolean(filterParams.minPrice) ||
    Boolean(filterParams.maxPrice);

  function selectshoe(id: string, name: string) {
    if (selectIsOn) {
      if (selectedShoes && selectedShoes.some((shoe) => shoe.id === id)) {
        setSelectedShoes(selectedShoes.filter((sid) => sid.id !== id));
      } else {
        setSelectedShoes([...(selectedShoes || []), { id, name }]);
      }
    }
  }

  function SearchProduct(value: string) {
    setFilterParams((prev) => ({
      ...prev,
      ProductName: value,
    }));
  }

  function scrollToListings() {
    const element = document.getElementById("listings");
    if (element) {
      const targetPosition =
        element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  }

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-1 pb-2 pt-2 lg:items-center lg:pb-4">
        <Input
          defaultValue={filterParams.ProductName ?? ""}
          placeholder="Search Product..."
          className="w-full lg:max-w-3xl px-4 py-2 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          onChange={(e) => {
            SearchProduct(e.target.value);
          }}
        />
        <p className="w-full text-sm font-medium text-gray-600 lg:max-w-3xl">
          Listings ({listings.length})
        </p>
      </div>
      <div id="listings" className="grid w-full lg:grid-cols-4">
        <div className="hidden flex-col lg:col-span-1 lg:mr-14 lg:inline-flex">
          <FilterTool
            models={strModels}
            sizes={sizes}
            filterTool={filterParams}
            setfilterTool={setFilterParams}
            syncUrl={false}
          />
        </div>
        <div className="w-full lg:col-span-3">
          <div className="z-50 flex w-full items-center justify-end gap-2 pb-2 pt-2 lg:sticky lg:top-14 lg:justify-between lg:bg-background lg:pb-4">
            <label className="items-center gap-2 cursor-pointer hidden lg:flex">
              <input
                type="checkbox"
                checked={selectIsOn}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelectIsOn(checked);
                  if (!checked) setSelectedShoes([]);
                }}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                aria-checked={selectIsOn}
              />
              <span className="text-lg font-medium">Enable select</span>
              {selectedShoes && selectedShoes.length > 0 && (
                <span className="rounded-full bg-purple-100 px-2 py-1 text-sm font-semibold text-purple-800">
                  {selectedShoes.length} selected
                </span>
              )}

              {selectIsOn && (
                <Button
                  variant="outline"
                  className="ml-2 bg-purple-100 text-purple-800 hover:bg-purple-200"
                  onClick={() => {
                    const allSelected =
                      (selectedShoes?.length ?? 0) === listings.length;
                    if (allSelected) {
                      setSelectedShoes([]);
                    } else {
                      setSelectedShoes(
                        listings.map((shoe) => ({
                          id: shoe.shoeId,
                          name: shoe.modelName + shoe.color,
                        })),
                      );
                    }
                  }}
                >
                  {(selectedShoes?.length ?? 0) === listings.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              )}
            </label>

            <div className="flex gap-1">
              <MultipleItemsOrder
                shoes={products}
                onSuccess={() => {
                  // Refresh listings or update UI
                }}
              />

              <Drawer>
                <DrawerTrigger asChild className="lg:hidden">
                  <Button
                    onClick={() => scrollToListings()}
                    variant="outline"
                    className={cn(
                      hasActiveFilters && "font-medium text-purple-900",
                    )}
                  >
                    Filter <FilterIcon className="size-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh]">
                  <DrawerHeader>
                    <DrawerTitle className="text-xl font-medium">
                      Filter tools
                    </DrawerTitle>
                    <div className="flex w-full items-center justify-between">
                      <h3 className="w-full text-left text-lg font-medium">
                        Filters
                      </h3>
                      <Filter className="size-6" color="#000" strokeWidth={2} />
                    </div>
                  </DrawerHeader>
                  <FilterTool
                    models={strModels}
                    sizes={sizes}
                    filterTool={filterParams}
                    setfilterTool={setFilterParams}
                    syncUrl={false}
                  />
                </DrawerContent>
              </Drawer>
            </div>
          </div>
          {listings.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-600">
              {products.length === 0
                ? borrowerName
                  ? `${borrowerName} is not holding any stock.`
                  : "Nothing on the shelf yet."
                : "No product matches these filters."}
            </p>
          ) : (
            <div className="grid w-full grid-cols-1 gap-3 py-2 pb-10 sm:grid-cols-2 md:grid-cols-3 md:gap-4 lg:gap-4 lg:pr-8">
              {listings.map((p) => (
                <ProductCard
                  key={p.shoeId}
                  product={p}
                  selectshoe={selectshoe}
                  selectedShoes={selectedShoes}
                  selectEnabled={selectIsOn}
                  borrowerName={borrowerName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
