"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type ImagesFilter,
  type PriceFilter,
  type ProductFilters,
  type StockFilter,
} from "./params";

// Admin renders lang="en" (see proxy.ts), and the rest of this page's controls
// are English. The French `sans prix` / `archivé` badges in the rows are
// pre-existing and left alone.
const PRICE_LABELS: Record<PriceFilter, string> = {
  all: "Price: any",
  priced: "Priced",
  unpriced: "Unpriced",
};

const IMAGES_LABELS: Record<ImagesFilter, string> = {
  all: "Images: any",
  with: "With images",
  without: "Without images",
};

export default function ProductsFilterBar({
  search,
  onSearchChange,
  filters,
  onChange,
  onClear,
  showClear,
  resultLabel,
  archivedCount,
}: {
  /** Local, debounced mirror of `?q=` — the bar never owns the URL itself. */
  search: string;
  onSearchChange: (value: string) => void;
  filters: ProductFilters;
  onChange: (patch: Partial<ProductFilters>) => void;
  onClear: () => void;
  showClear: boolean;
  resultLabel: string;
  archivedCount: number;
}) {
  return (
    // Parks under the admin header, which is `sticky top-0 z-30` and h-14
    // (app/admin/(admin)/layout.tsx) — top-0 here would slide beneath it, and
    // a z at or above 30 would ride over it.
    <div className="bg-background sticky top-14 z-20 -mx-4 border-b px-4 py-3 md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search model name..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="max-w-sm pl-8"
          />
        </div>

        {/* Flipped often enough to be worth the width. */}
        <ToggleGroup
          type="single"
          value={filters.stock}
          onValueChange={(value) => value && onChange({ stock: value as StockFilter })}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="in">In stock</ToggleGroupItem>
          <ToggleGroupItem value="out">Out of stock</ToggleGroupItem>
          <ToggleGroupItem value="all">Any stock</ToggleGroupItem>
        </ToggleGroup>

        {/* Usually set from the warning banners rather than here. Explicit
            children on SelectValue: Radix otherwise portals the label in from
            SelectContent, which isn't mounted until the menu is first opened,
            so the trigger paints blank on load. */}
        <Select
          value={filters.price}
          onValueChange={(value) => onChange({ price: value as PriceFilter })}
        >
          <SelectTrigger className="w-[150px]" size="sm">
            <SelectValue>{PRICE_LABELS[filters.price]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Price: any</SelectItem>
            <SelectItem value="priced">Priced</SelectItem>
            <SelectItem value="unpriced">Unpriced</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.images}
          onValueChange={(value) => onChange({ images: value as ImagesFilter })}
        >
          <SelectTrigger className="w-[160px]" size="sm">
            <SelectValue>{IMAGES_LABELS[filters.images]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Images: any</SelectItem>
            <SelectItem value="with">With images</SelectItem>
            <SelectItem value="without">Without images</SelectItem>
          </SelectContent>
        </Select>

        {/* Always rendered, even at zero: it is the only way out of an
            ?archived=1 URL, so hiding it would strand anyone who lands on one. */}
        <ToggleGroup
          type="single"
          value={filters.archived}
          onValueChange={(value) =>
            value && onChange({ archived: value === "archived" ? "archived" : "active" })
          }
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="active">Active</ToggleGroupItem>
          <ToggleGroupItem value="archived">
            Archived{archivedCount > 0 && ` (${archivedCount})`}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="text-muted-foreground mt-2 flex items-center gap-3 text-sm">
        <span>{resultLabel}</span>
        {showClear && (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
