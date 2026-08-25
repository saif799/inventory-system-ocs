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
import { Dispatch, SetStateAction, useMemo, useState, type ChangeEvent } from "react";
import { Input } from "./ui/input";
import { Filter, Minus, Plus, Search, X } from "lucide-react";
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
  /** Accessible name for a summary chip's remove button. */
  remove?: (label: string) => string;
  /** Shown when the model list has no matches. */
  empty?: string;
};

/** Above this many models the list gets its own search box — scrolling a
 *  60-item checkbox column on a phone is not a filter, it's a chore. */
const MODEL_SEARCH_THRESHOLD = 8;

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
   *  `.sf-chip` size chips instead of the admin `SizeButton`, and the mobile
   *  summary row (active filters + clear-all) that the desktop rail keeps in
   *  its `lg:`-only header. */
  variant?: "admin" | "storefront";
  /** When false, filter changes don't touch the URL (caller owns navigation). */
  syncUrl?: boolean;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [modelQuery, setModelQuery] = useState("");

  const resolvedLabels = {
    filters: labels?.filters ?? "Filters",
    model: labels?.model ?? "Model",
    size: labels?.size ?? "Size",
    bounds: labels?.bounds ?? (boundsMode === "price" ? "Price" : "Quantity"),
    minPlaceholder: labels?.minPlaceholder ?? (boundsMode === "price" ? "min price" : "min quantity"),
    maxPlaceholder: labels?.maxPlaceholder ?? (boundsMode === "price" ? "max price" : "max quantity"),
    // This component is shared with /admin, which passes no labels at all, so
    // every string needs an English default rather than a French one.
    remove: labels?.remove ?? ((label: string) => `Remove ${label}`),
    empty: labels?.empty ?? "No model",
  };

  const sortedModels = useMemo(() => [...models].sort((a, b) => a.localeCompare(b)), [models]);
  const visibleModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return sortedModels;
    return sortedModels.filter((m) => m.toLowerCase().includes(q));
  }, [sortedModels, modelQuery]);

  function clearQueryString() {
    // Read the live URL rather than the `searchParams` snapshot: every other
    // handler here writes with history.replaceState, which never re-renders
    // the hook, so that snapshot can be several filter clicks stale.
    const params = new URLSearchParams(
      typeof window === "undefined" ? searchParams.toString() : window.location.search,
    );

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

  function clearAll() {
    const next = clearQueryString();
    setModelQuery("");
    if (syncUrl) router.push(pathname + "?" + next, { scroll: false });
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

  function clearBounds() {
    setfilterTool((prev) => ({ ...prev, minPrice: "", maxPrice: "" }));
    updatePrice("minPrice", null);
    updatePrice("maxPrice", null);
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
      "ps-2 text-lg font-light text-black data-[state=open]:font-medium",
      active && cn("font-medium", accentClassName),
      isStorefront &&
        // py-5 on mobile: inside the drawer the trigger is the only thing to
        // aim at, so the row sits comfortably past the 44px touch target.
        "group py-5 ps-0 text-base normal-case tracking-normal hover:no-underline lg:py-4 lg:text-sm [&>svg:last-child]:hidden",
    );
  const triggerStyle = (active: boolean) => (active ? { color: accentHex } : undefined);

  const caret = isStorefront && (
    <>
      <Plus className="size-4 shrink-0 text-(--sf-muted) group-data-[state=open]:hidden" strokeWidth={1.5} />
      <Minus className="hidden size-4 shrink-0 text-(--sf-muted) group-data-[state=open]:block" strokeWidth={1.5} />
    </>
  );

  /** How many values a collapsed section is holding — the only way to read
   *  the state of a closed accordion without opening it. */
  const sectionCount = (n: number) =>
    isStorefront && n > 0 ? (
      <span
        className="flex h-5 min-w-5 items-center justify-center rounded-(--sf-radius-sm) px-1 text-[11px] font-medium text-(--sf-accent-fg)"
        style={{ backgroundColor: accentHex }}
      >
        {n}
      </span>
    ) : null;

  /** One applied value, rendered as a removable tag in the mobile summary. */
  const summaryChip = (key: string, label: string, onRemove: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onRemove}
      aria-label={resolvedLabels.remove(label)}
      className="flex h-8 items-center gap-1.5 rounded-(--sf-radius-sm) bg-(--sf-ink) px-2.5 text-xs font-medium text-(--sf-ink-fg)"
    >
      <span className="max-w-[9rem] truncate">{label}</span>
      <X className="size-3.5 shrink-0" strokeWidth={2} />
    </button>
  );

  const accordionItems = (
    <>
      <AccordionItem value="model">
        <AccordionTrigger className={triggerClass(modelActive)} style={triggerStyle(modelActive)}>
          {isStorefront ? (
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span>{resolvedLabels.model}</span>
                {sectionCount(filterTool.models.length)}
              </span>
              {caret}
            </span>
          ) : (
            <p>{resolvedLabels.model}</p>
          )}
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          {sortedModels.length > MODEL_SEARCH_THRESHOLD && (
            <div className="relative">
              <Search
                className={cn(
                  "pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2",
                  isStorefront ? "text-(--sf-muted)" : "text-gray-400",
                )}
                strokeWidth={1.5}
              />
              <Input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder={`${resolvedLabels.model}...`}
                aria-label={resolvedLabels.model}
                className={cn("h-11 w-full ps-9", isStorefront && "rounded-(--sf-radius)")}
              />
            </div>
          )}
          {/* max-h, not h: a short — or searched-down — list should not leave a
              half-empty scroll well sitting above the next section. */}
          <div className="relative max-h-[38vh] w-full overflow-y-auto overscroll-contain pe-1 lg:max-h-[50vh]">
            {visibleModels.length === 0 ? (
              <p className={cn("px-3 py-4 text-sm", isStorefront ? "text-(--sf-muted)" : "text-gray-500")}>
                {resolvedLabels.empty}
              </p>
            ) : (
              visibleModels.map((m) => (
                <label
                  key={m}
                  htmlFor={m}
                  className={cn(
                    "flex cursor-pointer items-center hover:font-medium",
                    // The whole row is the hit area on touch, not just the 16px box.
                    isStorefront
                      ? "min-h-11 gap-3 rounded-(--sf-radius-sm) py-1 ps-3 pe-2"
                      : "gap-2 ps-3",
                  )}
                >
                  <Checkbox
                    id={m}
                    checked={filterTool.models.includes(m)}
                    onCheckedChange={() => selectModelFilterS(m)}
                  />
                  <span className="text-base">{m}</span>
                </label>
              ))
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="size">
        <AccordionTrigger className={triggerClass(sizeActive)} style={triggerStyle(sizeActive)}>
          {isStorefront ? (
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span>{resolvedLabels.size}</span>
                {sectionCount(filterTool.sizes.length)}
              </span>
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
          {/* min-w-0 on both fields: number inputs carry an intrinsic min-width
              that overflows the drawer once the placeholders are spelled out. */}
          <div className="flex w-full flex-row items-center gap-3 px-1 py-1">
            <div className="min-w-0 flex-1">
              <Input
                value={filterTool.minPrice ?? ""}
                id="minBound"
                name="minBound"
                type="number"
                inputMode="numeric"
                className={cn(
                  "h-12 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  isStorefront && "h-11 rounded-(--sf-radius) border-(--sf-line) focus:ring-0",
                )}
                placeholder={resolvedLabels.minPlaceholder}
                onChange={minPriceCtrl}
                min="0"
              />
            </div>
            <div
              className={cn(
                "my-0 w-4 shrink-0 border-t-[3px] border-black",
                isStorefront && "border-t border-(--sf-line)",
              )}
            ></div>
            <div className="min-w-0 flex-1">
              <Input
                value={filterTool.maxPrice ?? ""}
                id="maxBound"
                name="maxBound"
                type="number"
                inputMode="numeric"
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
            "w-full text-start text-xl font-medium",
            // sf-body, not sf-heading: the latter forces text-transform:none
            // (an unlayered rule), which would silently cancel `uppercase`.
            isStorefront && "sf-body text-xs uppercase tracking-[0.12em] text-(--sf-text)",
          )}
        >
          {resolvedLabels.filters}
        </h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <X strokeWidth={1.8} className={cn("cursor-pointer", accentClassName)} onClick={clearAll} />
          )}
          <Filter className="size-6" color={hasActiveFilters ? accentHex : mutedHex} strokeWidth={2} />
        </div>
      </div>

      {/* Mobile summary. The desktop rail carries the same two affordances in
          its header, which is `lg:`-only — without this a phone user can see
          neither what is applied nor how to undo it, since the sections are
          collapsed by then. */}
      {isStorefront && hasActiveFilters && (
        <div className="flex flex-col gap-2 border-b border-(--sf-line) pb-3 pt-1 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="sf-body text-xs uppercase tracking-[0.12em] text-(--sf-muted)">
              {resolvedLabels.filters}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="sf-body text-xs font-medium underline underline-offset-4"
              style={{ color: accentHex }}
            >
              Tout effacer
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterTool.models.map((m) => summaryChip(`model-${m}`, m, () => selectModelFilterS(m)))}
            {filterTool.sizes.map((s) =>
              summaryChip(`size-${s}`, `${resolvedLabels.size} ${s}`, () => selectSizesFilterS(s)),
            )}
            {boundsActive &&
              summaryChip(
                "bounds",
                `${filterTool.minPrice || "0"} - ${filterTool.maxPrice || "∞"}`,
                clearBounds,
              )}
          </div>
        </div>
      )}

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
