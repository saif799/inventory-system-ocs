/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";
import FilterTool from "./filterTool";
import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "./ui/button";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Filter,
  FilterIcon,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/customSelect";
import { Label } from "./ui/label";
import { shoeModels } from "@/lib/schema";
import { InferSelectModel } from "drizzle-orm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PrintPdf from "@/lib/print";
import ProductCard from "./productCard";
import SendOrderForm from "./sendShoeOrder";

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
  36, 36.5, 37, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45,
  45.5, 46, 47, 47.5, 48, 48.5, 49, 50, 50.5, 51,
];
export default function Listings({
  products,
  models,
}: {
  products: Array<shoesType>;
  models: shoe_modelsType;
}) {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Array<shoesType>>(products);
  const [selectedShoes, setSelectedShoes] =
    useState<Array<{ id: string; name: string }>>();
  const [selectIsOn, setSelectIsOn] = useState<boolean>(false);
  const selectedModels = searchParams.get("models")?.split(",") ?? [];
  const [sortOption, setSortOption] = useState<"asc" | "desc">();

  const selectedSizes =
    searchParams
      .get("sizes")
      ?.split(",")
      .map((size) => parseFloat(size)) ?? [];
  // const [selectedSizes, setSelectedSizes] = useState<number[]>([]);

  const minQuantity = searchParams.get("minPrice");
  const maxQuantity = searchParams.get("maxPrice");

  const strModels = models.map((m) => m.modelName);

  useEffect(() => {
    let filteredshoes = products;
    if (selectedModels.length > 0) {
      filteredshoes = products.filter((l) =>
        selectedModels.includes(l.modelName)
      );
    }

    if (selectedSizes.length > 0) {
      filteredshoes = products.filter((l) =>
        selectedSizes.includes(parseFloat(l.size))
      );
    }

    if (maxQuantity || minQuantity) {
      filteredshoes = products.filter(
        (l) =>
          l.quantity <= (maxQuantity ? parseFloat(maxQuantity) : Infinity) &&
          l.quantity >= (minQuantity ? parseFloat(minQuantity) : 0)
      );
    }

    setListings(filteredshoes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, searchParams]);

  function selectshoe(id: string, name: string) {
    if (selectIsOn) {
      if (selectedShoes && selectedShoes.some((shoe) => shoe.id === id)) {
        setSelectedShoes(selectedShoes.filter((sid) => sid.id !== id));
      } else {
        setSelectedShoes([...(selectedShoes || []), { id, name }]);
      }
    }
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
      <div className="flex w-full items-center justify-between bg-white px-4 pb-2 pt-2 gap-2 lg:pb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Scan barcode..."
              className="w-full px-4 py-2  text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onChange={(e) => {
                const barcode = e.target.value;
                if (barcode) {
                  const url = new URL(window.location.href);
                  url.searchParams.set("barcode", barcode);
                  window.history.pushState({}, "", url.toString());
                } else {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("barcode");
                  window.history.pushState({}, "", url.toString());
                }
              }}
            />
          </div>
        </div>
        <Dialog>
          <DialogTrigger className="rounded-md bg-purple-500  p-1 text-primary-foreground hover:bg-purple-600 md:p-2">
            Add an Order
          </DialogTrigger>
          <DialogContent
            className="w-full max-w-full sm:max-w-xl transition-all duration-300 max-h-[80vh] overflow-y-auto overflow-x-hidden px-2 md:p-6"
            style={{ boxSizing: "border-box" }}
          >
            <DialogHeader>
              <DialogTitle>add an Order</DialogTitle>
              <DialogDescription>enter the client info</DialogDescription>
            </DialogHeader>
            <div className="w-full">
              <SendOrderForm shoe={listings[0]} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div id="listings" className="grid w-full lg:grid-cols-4">
        <div className="hidden flex-col lg:col-span-1 lg:ml-4 lg:mr-14 lg:inline-flex">
          <FilterTool models={strModels} sizes={sizes} />
        </div>
        <div className="col-span-3 w-full">
          <div className="top-[62px] z-50 flex w-full items-center justify-between bg-white px-4 pb-2 pt-2 lg:sticky lg:pb-4">
            <label className="flex items-center gap-2 cursor-pointer">
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
                            id: shoe.id,
                            name: shoe.modelName + shoe.color + shoe.size,
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
                              (selected) => selected.id === shoe.id
                            )
                          )
                          .map((shoe) => ({
                            id: shoe.id,
                            name: shoe.modelName + shoe.color + shoe.size,
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
              Listings ({products.length})
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
                      selectedSizes.length > 0 ||
                      maxQuantity ||
                      minQuantity) &&
                      "font-medium text-purple-900"
                  )}
                >
                  Filter <FilterIcon className="size-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader>
                  <DrawerTitle>filter tools</DrawerTitle>
                  <div className="flex w-full items-center justify-between pb-4">
                    <h3 className="w-full text-left text-xl font-medium">
                      Filters
                    </h3>
                    <Filter className="size-6" color="#000" strokeWidth={2} />
                  </div>{" "}
                </DrawerHeader>
                <div className="flex w-full flex-col pb-2 pl-6 lg:hidden">
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
                </div>
                <FilterTool models={strModels} sizes={sizes} />
              </DrawerContent>
            </Drawer>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 py-2 px-3 pb-10 md:grid-cols-3 md:gap-4 lg:gap-4 lg:pr-8">
            {listings
              .sort((pa, pb) => {
                if (sortOption === "asc") {
                  return pa.quantity - pb.quantity;
                } else if (sortOption === "desc") {
                  return pb.quantity - pa.quantity;
                } else {
                  return 0;
                }
              })
              .map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  modelName={p.modelName}
                  color={p.color}
                  size={p.size}
                  quantity={p.quantity}
                  selectshoe={selectshoe}
                  selectedShoes={selectedShoes}
                  // Inform the card whether selection mode is active and whether this item is selected
                  // selectable={selectIsOn}

                  // selected={selectedShoes?.some((s) => s.id === p.id) ?? false}
                  // Handler used when the card is clicked/tapped to toggle selection
                  // onSelect={() => selectshoe(p.id, p.modelName)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
