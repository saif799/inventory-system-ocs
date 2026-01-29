/* eslint-disable @next/next/no-img-element */
"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import SizeButton from "./SizeButton";
import { Dispatch, SetStateAction, useState, type ChangeEvent } from "react";
import { Input } from "./ui/input";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FilterParams = {
  models: string[];
  sizes: number[];
  minPrice?: string | null;
  maxPrice?: string | null;
  ProductName?: string;
};

export default function FilterTool({
  models,
  sizes,
  filterTool,
  setfilterTool,
}: {
  models: string[];
  sizes: number[];
  filterTool: FilterParams;
  setfilterTool: Dispatch<SetStateAction<FilterParams>>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
 
  function clearQueryString() {
    const params = new URLSearchParams(searchParams);

    Object.keys(filterTool).forEach((key) => {
      if (params.has(key)) {
        params.delete(key);
      }
    });

    setfilterTool({
      models: [],
      sizes: [],
      maxPrice: undefined,
      minPrice: undefined,
      ProductName: undefined,
    });

    return params.toString();
  }

  function selectModelFilterS(newModel: string) {
    const Check = filterTool.models.includes(newModel)
      ? filterTool.models.filter((m) => m !== newModel)
      : [...filterTool.models, newModel];

    const newValue = Check.length > 0 ? Check.join(",") : "";

    setfilterTool((prev) => ({
      ...prev,
      models: Check,
    }));

    const params = new URLSearchParams(window.location.search);

    if (newValue) {
      params.set("models", newValue);
    } else {
      params.delete("models");
    }

    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function selectSizesFilterS(size: number) {
    const Check = filterTool.sizes.includes(size)
      ? filterTool.sizes.filter((m) => m !== size)
      : [...filterTool.sizes, size];

    const newValue = Check.length > 0 ? Check.join(",") : "";
    setfilterTool((prev) => ({
      ...prev,
      sizes: Check,
    }));

    const params = new URLSearchParams(window.location.search);

    if (newValue) {
      params.set("sizes", newValue);
    } else {
      params.delete("sizes");
    }

    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function updatePrice(name: string, value: number) {
    const params = new URLSearchParams(window.location.search);

    if (value) {
      params.set(name, value.toString());
    } else {
      params.delete(name, value.toString());
    }

    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function minPriceCtrl(e: ChangeEvent<HTMLInputElement>) {
    const numValue = parseFloat(e.target.value);
    setfilterTool((prev) => ({
      ...prev,
      minPrice: !isNaN(numValue) ? numValue.toString() : "",
    }));
    updatePrice("minPrice", !isNaN(numValue) ? numValue : 0);
  }

  function maxPriceCtrl(e: ChangeEvent<HTMLInputElement>) {
    const numValue = parseFloat(e.target.value);
    setfilterTool((prev) => ({
      ...prev,
      maxPrice: !isNaN(numValue) ? numValue.toString() : "",
    }));
    updatePrice("maxPrice", !isNaN(numValue) ? numValue : Infinity);
  }

  return (
    <div className="px-5 lg:sticky lg:top-[73px] lg:px-0 overflow-y-scroll">
      <div className="hidden w-full items-center justify-between pb-4 lg:flex">
        <h3 className="w-full text-left text-xl font-medium">Filters</h3>
        <div className="flex items-center space-x-2">
          {(filterTool.models.length > 0 ||
            filterTool.sizes.length > 0 ||
            (filterTool.maxPrice ?? filterTool.minPrice)) && (
            <X
              strokeWidth={1.8}
              className="cursor-pointer text-purple-900"
              onClick={() => {
                router.push(pathname + "?" + clearQueryString(), {
                  scroll: false,
                });
              }}
            />
          )}
          <Filter
            className="size-6"
            color={
              filterTool.models.length > 0 ||
              filterTool.sizes.length > 0 ||
              filterTool.maxPrice ||
              filterTool.minPrice
                ? "#581c87"
                : "#aaa"
            }
            strokeWidth={2}
          />
        </div>
      </div>

      <Accordion type="single" className="w-full overflow-y-scroll" collapsible>
        <AccordionItem value="model">
          <AccordionTrigger
            className={cn(
              "pl-2 text-lg font-light text-black data-[state=open]:font-medium",
              filterTool.models.length > 0 ? "font-medium text-purple-900" : ""
            )}
          >
            <p>Model</p>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 overflow-y-scroll">
            <div
              className="relative h-[50vh] w-full overflow-y-auto pr-3"
              // scrollHideDelay={1000}
            >
              {models
                .sort((a, b) => a.localeCompare(b))
                .map((m) => (
                  <div
                    key={m}
                    className="flex cursor-pointer items-center space-x-2 pl-3 hover:font-medium"
                  >
                    <Checkbox
                      id={m}
                      checked={filterTool.models.includes(m)}
                      onCheckedChange={() => selectModelFilterS(m)}
                    />
                    <label htmlFor={m} className="text-base">
                      {m}
                    </label>
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="size">
          <AccordionTrigger
            className={cn(
              "pl-2 text-lg font-light text-black data-[state=open]:font-medium",
              filterTool.sizes.length > 0 ? "font-medium text-purple-900" : ""
            )}
          >
            <p>Size</p>
          </AccordionTrigger>
          <AccordionContent className="flex flex-wrap items-center gap-2">
            {sizes.map((s) => (
              <SizeButton
                key={s}
                disabled={false}
                selectHandler={() => selectSizesFilterS(s)}
                size={s}
                isSelected={filterTool.sizes.includes(s)}
              />
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="quantity">
          <AccordionTrigger
            className={cn(
              "pl-2 text-lg font-light text-black data-[state=open]:font-medium",
              filterTool.minPrice || filterTool.maxPrice
                ? "font-medium text-purple-900"
                : ""
            )}
            value={"open"}
          >
            <p>Quantity</p>
          </AccordionTrigger>
          <AccordionContent className="flex flex-wrap items-center gap-2">
            <div className="flex flex-row items-center gap-4 px-1 py-1">
              <div className="w-full grow">
                <Input
                  value={
                    filterTool.minPrice ? parseFloat(filterTool.minPrice) : 0
                  }
                  id="minQuantity"
                  name="minQuantity"
                  type="number"
                  className="h-12 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="min quantity"
                  onChange={minPriceCtrl}
                  min="0"
                />
              </div>
              <div className="my-0 w-5 border-t-[3px] border-black"></div>
              <div className="w-full grow">
                <Input
                  value={
                    filterTool.maxPrice
                      ? parseFloat(filterTool.maxPrice)
                      : Infinity
                  }
                  id="maxQuantity"
                  name="maxQuantity"
                  type="number"
                  className="h-12 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="max quantity"
                  onChange={maxPriceCtrl}
                  min="0"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
