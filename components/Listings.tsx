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
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Filter,
  FilterIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/customSelect";
import { shoeModels } from "@/lib/schema";
import { InferSelectModel } from "drizzle-orm";

import PrintPdf from "@/lib/print";
import ProductCard from "./productCard";
import { Input } from "./ui/input";
import { GroupedProduct } from "@/app/(inventory)/page";
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
}: {
  products: GroupedProduct[];
  models: shoe_modelsType;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [selectedShoes, setSelectedShoes] =
    useState<Array<{ id: string; name: string }>>();
  const [selectIsOn, setSelectIsOn] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<"asc" | "desc">();

  type FilterParams = {
    models: string[];
    sizes: number[];
    minPrice?: string | null;
    maxPrice?: string | null;
    ProductName?: string;
  };
  const selectedModels = searchParams.get("models")?.split(",") ?? [];

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

  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams();
      if (filterParams.ProductName) {
        params.set("ProductName", filterParams.ProductName);
      }
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 300);

    return () => clearTimeout(id);
  }, [filterParams.ProductName]);

  const strModels = models.map((m) => m.modelName);

  const productsWithSearch = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        lowerModelColor: `${p.modelName} ${p.color}`.toLowerCase(),
        sizesNum: p.sizes.map((s) => ({ ...s, sizeNum: Number(s.size) })),
      })),
    [products]
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
      !p.lowerModelColor.includes(filterParams.ProductName)
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

  // eslint-disable-next-line react-hooks/exhaustive-deps

  function selectshoe(id: string, name: string) {
    if (selectIsOn) {
      if (selectedShoes && selectedShoes.some((shoe) => shoe.id === id)) {
        setSelectedShoes(selectedShoes.filter((sid) => sid.id !== id));
      } else {
        setSelectedShoes([...(selectedShoes || []), { id, name }]);
      }
    }
  }

  function createQueryString(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    return params.toString();
  }

  function SearchProduct(value: string) {
    setFilterParams((prev) => ({
      ...prev,
      ProductName: value,
    }));

    const params = new URLSearchParams(window.location.search);

    if (value) {
      params.set("ProductName", value);
    } else {
      params.delete("ProductName", value);
    }

    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function scrollToListings() {
    const element = document.getElementById("listings");
    if (element) {
      const targetPosition =
        element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  }
  function handleSorting(value: string) {
    setSortOption(value === "asc" || value === "desc" ? value : undefined);
  }

  return (
    <div className="w-full">
      <div className=" flex w-full items-center justify-center bg-white px-4 pb-2 pt-2 gap-2 lg:pb-4">
        <Input
          // value={searchQuery ?? ""}
          defaultValue={filterParams.ProductName ?? ""}
          placeholder="Search Product..."
          className="w-full lg:max-w-3xl px-4 py-2  text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          onChange={(e) => {
            SearchProduct(e.target.value);
          }}
        />
      </div>
      <div id="listings" className="grid w-full lg:grid-cols-4">
        <div className="hidden flex-col lg:col-span-1 lg:ml-4 lg:mr-14 lg:inline-flex">
          <FilterTool
            models={strModels}
            sizes={sizes}
            filterTool={filterParams}
            setfilterTool={setFilterParams}
          />
        </div>
        <div className="col-span-3 w-full">
          <div className="top-[62px] z-50 flex w-full items-center justify-between bg-white px-4 pb-2 pt-2 lg:sticky lg:pb-4">
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
                <>
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
                          }))
                        );
                      }
                    }}
                  >
                    {(selectedShoes?.length ?? 0) === listings.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>

                  {selectedShoes && selectedShoes.length > 0 && (
                    <Button
                      variant="outline"
                      className="ml-2 bg-purple-100 text-purple-800 hover:bg-purple-200"
                      onClick={() => {
                        const shoesToPrint = listings
                          .filter((shoe) =>
                            selectedShoes.some(
                              (selected) => selected.id === shoe.shoeId
                            )
                          )
                          .map((shoe) => ({
                            id: shoe.shoeId,
                            name: shoe.modelName + shoe.color,
                          }));

                        PrintPdf(shoesToPrint);
                      }}
                    >
                      Print Selected
                    </Button>
                  )}
                </>
              )}
            </label>
            <h3 className="text-left text-xl font-medium">
              Listings ({listings.length})
            </h3>

            <div className="hidden items-center gap-1 pr-4 lg:inline-flex">
              <p className="font-medium">Order by</p>
              <Select onValueChange={(e) => handleSorting(e)}>
                <SelectTrigger className="w-max">
                  <SelectValue placeholder="Most Recent" className="w-full" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <p>Most Recent</p>
                  </SelectItem>
                  <SelectItem value="asc">
                    <div className="flex items-center justify-between gap-2">
                      <p>Price: Ascending</p>
                      <ArrowUp strokeWidth={1.5} size={17} />
                    </div>
                  </SelectItem>
                  <SelectItem value="desc">
                    <div className="flex w-full items-center justify-between gap-2">
                      Price: Descending{" "}
                      <ArrowDown strokeWidth={1.5} size={17} />
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <ArrowDownUp strokeWidth={1.5} size={18} />
            </div>
            <Drawer>
              <DrawerTrigger asChild className="lg:hidden">
                <Button
                  onClick={() => scrollToListings()}
                  variant="outline"
                  className={cn(
                    "",

                    ((selectedModels && selectedModels.length > 0) ||
                      filterParams.sizes.length > 0 ||
                      filterParams.maxPrice ||
                      filterParams.minPrice) &&
                      "font-medium text-purple-900"
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
                  <div className="flex w-full items-center justify-between pb-">
                    <h3 className="w-full text-left text-lg font-medium">
                      Filters
                    </h3>
                    <Filter className="size-6" color="#000" strokeWidth={2} />
                  </div>{" "}
                </DrawerHeader>
                {/* <div className="flex w-full flex-col pb-2 pl-6 lg:hidden">
                  <h5 className="pb-4 text-lg text-black">Sort by</h5>
                  <div className="flex items-center space-x-2 pl-3 hover:font-medium">
                    <RadioGroup
                      className="flex flex-col space-y-3"
                      defaultValue="none"
                      value={sortOption ? sortOption : "none"}
                      onValueChange={(v) => handleSorting(v)}
                    >
                      <div className="flex w-full gap-3">
                        <RadioGroupItem
                          value="none"
                          id="most-recent"
                          className="text-purple-800"
                        />
                        <Label className="text-black" htmlFor="most-recent">
                          Most Recent
                        </Label>
                      </div>
                      <div className="flex w-full gap-3">
                        <RadioGroupItem
                          value="asc"
                          id="price-asc"
                          className="text-purple-800"
                        />
                        <Label className="text-black" htmlFor="price-asc">
                          Price : Ascending
                        </Label>
                        <ArrowUp strokeWidth={1.8} size={17} />
                      </div>
                      <div className="flex w-full gap-3">
                        <RadioGroupItem
                          value="desc"
                          id="price-desc"
                          className="text-purple-800"
                        />
                        <Label className="text-black" htmlFor="price-desc">
                          Price : Descending
                        </Label>
                        <ArrowDown strokeWidth={1.8} size={17} />
                      </div>
                    </RadioGroup>
                  </div>
                </div> */}
                <FilterTool
                  models={strModels}
                  sizes={sizes}
                  filterTool={filterParams}
                  setfilterTool={setFilterParams}
                />
              </DrawerContent>
            </Drawer>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 py-2 px-3 pb-10 md:grid-cols-3 md:gap-4 lg:gap-4 lg:pr-8">
            {listings
              .sort((pa, pb) => {
                if (sortOption === "asc") {
                  return pa.modelName.localeCompare(pb.modelName);
                } else if (sortOption === "desc") {
                  return pb.modelName.localeCompare(pa.modelName);
                } else {
                  return 0;
                }
              })
              .map((p) => (
                <ProductCard
                  key={p.shoeId}
                  product={p}
                  selectshoe={selectshoe}
                  selectedShoes={selectedShoes}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
