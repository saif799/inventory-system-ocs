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
import { Dispatch, SetStateAction, useMemo, type ChangeEvent } from "react";
import { Input } from "./ui/input";
import { Filter, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type FilterParams = {
  models: string[];
  sizes: number[];
  minPrice?: string | null;
  maxPrice?: string | null;
  ProductName?: string;
};

type FilterLabels = {
  filters?: string;
  model?: string;
  size?: string;
  bounds?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
};

export default function FilterTool({
  models,
  sizes,
  filterTool,
  setfilterTool,
  boundsMode = "quantity",
  labels,
  accentClassName = "text-purple-900",
  accentHex = "#581c87",
  mutedHex = "#aaa",
  variant = "admin",
  syncUrl = true,
  className,
}: {
  models: string[];
  sizes: number[];
  filterTool: FilterParams;
  setfilterTool: Dispatch<SetStateAction<FilterParams>>;
  /** "quantity" (admin, default) filters on stock counts; "price" (storefront) on resolved price. */
  boundsMode?: "quantity" | "price";
  labels?: FilterLabels;
  accentClassName?: string;
  accentHex?: string;
  /** Colour of the funnel icon when no filter is active. */
  mutedHex?: string;
  /** "admin" (default) keeps the original look untouched. "storefront" applies
   *  the Court Line chrome — multiple sections open at once, +/- indicators,
   *  and `.sf-chip` size chips instead of the admin `SizeButton`. */
  variant?: "admin" | "storefront";
  /** When false, filter changes don't touch the URL (caller owns navigation). */
  syncUrl?: boolean;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const resolvedLabels = {
    filters: labels?.filters ?? "Filters",
    model: labels?.model ?? "Model",
    size: labels?.size ?? "Size",
    bounds: labels?.bounds ?? (boundsMode === "price" ? "Price" : "Quantity"),
    minPlaceholder: labels?.minPlaceholder ?? (boundsMode === "price" ? "min price" : "min quantity"),
    maxPlaceholder: labels?.maxPlaceholder ?? (boundsMode === "price" ? "max price" : "max quantity"),
  };

  const sortedModels = useMemo(() => [...models].sort((a, b) => a.localeCompare(b)), [models]);

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

    if (!syncUrl) return;
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

    if (!syncUrl) return;
    const params = new URLSearchParams(window.location.search);

    if (newValue) {
      params.set("sizes", newValue);
    } else {
      params.delete("sizes");
    }

    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function updatePrice(name: string, value: number | null) {
    if (!syncUrl) return;
    const params = new URLSearchParams(window.location.search);

    if (value != null) {
      params.set(name, value.toString());
    } else {
      params.delete(name);
    }

    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function minPriceCtrl(e: ChangeEvent<HTMLInputElement>) {
    const numValue = parseFloat(e.target.value);
    setfilterTool((prev) => ({
      ...prev,
      minPrice: !isNaN(numValue) ? numValue.toString() : "",
    }));
    updatePrice("minPrice", !isNaN(numValue) ? numValue : null);
  }

  function maxPriceCtrl(e: ChangeEvent<HTMLInputElement>) {
    const numValue = parseFloat(e.target.value);
    setfilterTool((prev) => ({
      ...prev,
      maxPrice: !isNaN(numValue) ? numValue.toString() : "",
    }));
    updatePrice("maxPrice", !isNaN(numValue) ? numValue : null);
  }

  const hasActiveFilters =
    filterTool.models.length > 0 || filterTool.sizes.length > 0 || !!(filterTool.maxPrice ?? filterTool.minPrice);

  const isStorefront = variant === "storefront";
  const modelActive = filterTool.models.length > 0;
  const sizeActive = filterTool.sizes.length > 0;
  const boundsActive = !!(filterTool.minPrice || filterTool.maxPrice);

  // The active-filter accent below is applied as an inline style rather than
  // `accentClassName` alone: `app/globals.css` sets a flat `color: var(--sf-text)`
  // on every `[data-slot='accordion-trigger']` inside the storefront theme
  // (unlayered, so it beats any Tailwind text-color utility on that same
  // element), which would otherwise cancel the accent the moment this runs
  // inside `[data-storefront]`. Inline style always wins over both.
  const triggerClass = (active: boolean) =>
    cn(
      "pl-2 text-lg font-light text-black data-[state=open]:font-medium",
      active && cn("font-medium", accentClassName),
      isStorefront && "group pl-0 text-sm normal-case tracking-normal hover:no-underline [&>svg:last-child]:hidden",
    );
  const triggerStyle = (active: boolean) => (active ? { color: accentHex } : undefined);

  const caret = isStorefront && (
    <>
      <Plus className="size-4 shrink-0 text-(--sf-muted) group-data-[state=open]:hidden" strokeWidth={1.5} />
      <Minus className="hidden size-4 shrink-0 text-(--sf-muted) group-data-[state=open]:block" strokeWidth={1.5} />
    </>
  );

  const accordionItems = (
    <>
      <AccordionItem value="model">
        <AccordionTrigger className={triggerClass(modelActive)} style={triggerStyle(modelActive)}>
          {isStorefront ? (
            <span className="flex w-full items-center justify-between gap-2">
              <span>{resolvedLabels.model}</span>
              {caret}
            </span>
          ) : (
            <p>{resolvedLabels.model}</p>
          )}
        </AccordionTrigger>
        <AccordionContent className="space-y-4 overflow-y-scroll">
          <div className="relative h-[50vh] w-full overflow-y-auto pr-3">
            {sortedModels.map((m) => (
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
        <AccordionTrigger className={triggerClass(sizeActive)} style={triggerStyle(sizeActive)}>
          {isStorefront ? (
            <span className="flex w-full items-center justify-between gap-2">
              <span>{resolvedLabels.size}</span>
              {caret}
            </span>
          ) : (
            <p>{resolvedLabels.size}</p>
          )}
        </AccordionTrigger>
        <AccordionContent className="flex flex-wrap items-center gap-2">
          {sizes.map((s) =>
            isStorefront ? (
              <button
                key={s}
                type="button"
                aria-pressed={filterTool.sizes.includes(s)}
                data-active={filterTool.sizes.includes(s)}
                onClick={() => selectSizesFilterS(s)}
                className="sf-chip size-11 text-sm font-medium"
              >
                {s}
              </button>
            ) : (
              <SizeButton
                key={s}
                disabled={false}
                selectHandler={() => selectSizesFilterS(s)}
                size={s}
                isSelected={filterTool.sizes.includes(s)}
              />
            ),
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="bounds">
        <AccordionTrigger className={triggerClass(boundsActive)} style={triggerStyle(boundsActive)}>
          {isStorefront ? (
            <span className="flex w-full items-center justify-between gap-2">
              <span>{resolvedLabels.bounds}</span>
              {caret}
            </span>
          ) : (
            <p>{resolvedLabels.bounds}</p>
          )}
        </AccordionTrigger>
        <AccordionContent className="flex flex-wrap items-center gap-2">
          <div className="flex flex-row items-center gap-4 px-1 py-1">
            <div className="w-full grow">
              <Input
                value={filterTool.minPrice ?? ""}
                id="minBound"
                name="minBound"
                type="number"
                className={cn(
                  "h-12 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  isStorefront && "h-11 rounded-(--sf-radius) border-(--sf-line) focus:ring-0",
                )}
                placeholder={resolvedLabels.minPlaceholder}
                onChange={minPriceCtrl}
                min="0"
              />
            </div>
            <div className="my-0 w-5 border-t-[3px] border-black"></div>
            <div className="w-full grow">
              <Input
                value={filterTool.maxPrice ?? ""}
                id="maxBound"
                name="maxBound"
                type="number"
                className={cn(
                  "h-12 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  isStorefront && "h-11 rounded-(--sf-radius) border-(--sf-line) focus:ring-0",
                )}
                placeholder={resolvedLabels.maxPlaceholder}
                onChange={maxPriceCtrl}
                min="0"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </>
  );

  return (
    <div className={className ?? "px-5 lg:sticky lg:top-[73px] lg:px-0 overflow-y-scroll"}>
      <div
        className={cn(
          "hidden w-full items-center justify-between pb-4 lg:flex",
          isStorefront && "border-b border-(--sf-line)",
        )}
      >
        <h3
          className={cn(
            "w-full text-left text-xl font-medium",
            // sf-body, not sf-heading: the latter forces text-transform:none
            // (an unlayered rule), which would silently cancel `uppercase`.
            isStorefront && "sf-body text-xs uppercase tracking-[0.12em] text-(--sf-text)",
          )}
        >
          {resolvedLabels.filters}
        </h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <X
              strokeWidth={1.8}
              className={cn("cursor-pointer", accentClassName)}
              onClick={() => {
                const next = clearQueryString();
                if (syncUrl) router.push(pathname + "?" + next, { scroll: false });
              }}
            />
          )}
          <Filter className="size-6" color={hasActiveFilters ? accentHex : mutedHex} strokeWidth={2} />
        </div>
      </div>

      {isStorefront ? (
        <Accordion type="multiple" defaultValue={[]} className="w-full">
          {accordionItems}
        </Accordion>
      ) : (
        <Accordion type="single" className="w-full overflow-y-scroll" collapsible>
          {accordionItems}
        </Accordion>
      )}
    </div>
  );
}
