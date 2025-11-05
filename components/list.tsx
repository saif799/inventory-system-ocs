/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";
// import ProductCard from "./productCard";
import FilterTool from "./filterTool";
import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { shoeModels } from "@/lib/schema";
import { InferSelectModel } from "drizzle-orm";

type shoe_modelsType = Array<InferSelectModel<typeof shoeModels>>;
type shoesType = Array<{
  modelId: string;
  modelName: string;
  color: string;
  quantity: number;
  size: string;
}>;

const sizes = [
  36, 36.5, 37, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45,
  45.5, 46, 47, 47.5, 48, 48.5, 49, 50, 50.5, 51,
];
export default function Listings({
  products,
  models,
}: {
  products: shoesType;
  models: shoe_modelsType;
}) {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<shoesType>(products);
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
    <div id="listings" className="grid w-full lg:grid-cols-4">
      <div className="hidden flex-col lg:col-span-1 lg:ml-4 lg:mr-14 lg:inline-flex"></div>
      <div className="col-span-3 w-full">
        <div className="top-[62px] z-50 flex w-full items-center justify-between bg-white px-4 pb-2 pt-2 lg:sticky lg:pb-4">
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
                    Price: Descending <ArrowDown strokeWidth={1.5} size={17} />
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
        <div className="grid w-full grid-cols-2 gap-3 px-3 pb-10 md:grid-cols-3 md:gap-4 lg:gap-4 lg:pr-8">
          {[...listings] // Clone the array to prevent mutation
            .sort((pa, pb) => {
              if (sortOption === "asc") {
                return pa.quantity - pb.quantity;
              } else if (sortOption === "desc") {
                return pb.quantity - pa.quantity;
              } else {
                return 0; // Keep original order
              }
            })
            .map((p, i) => (
              // <ProductCard
              //   priority={i < 6 ? "eager" : "lazy"}
              //   key={p.products.id}
              //   href={p.products.id}
              //   imageUrl={p.products.showCase}
              //   productTitle={p.products.name}
              //   brand={p.shoe_models.brand}
              //   price={p.products.price}
              // />
              <div key={p.modelId}>
                {" "}
                your custome product card should be here {p.modelName} {p.color}{" "}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
