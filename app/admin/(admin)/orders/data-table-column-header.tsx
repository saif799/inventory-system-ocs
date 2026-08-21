"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { OrderSortField, SortDirection } from "./params";

interface SortableHeaderProps {
  title: string;
  field: OrderSortField;
  /** The sort currently applied by the server, straight from the URL. */
  activeField: OrderSortField;
  activeDirection: SortDirection;
  onSort: (field: OrderSortField, direction: SortDirection) => void;
  className?: string;
}

/**
 * Sorting is resolved in SQL, so this header reflects the URL rather than any
 * client-side table state — sorting the 15 rows of the current page would be
 * silently wrong now that the other 496 live in the database.
 */
export function DataTableColumnHeader({
  title,
  field,
  activeField,
  activeDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = activeField === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[active=true]:text-foreground", className)}
      data-active={isActive}
      onClick={() =>
        // Re-clicking the active column flips it; a fresh column starts descending,
        // which is the useful direction for both a date and an amount.
        onSort(field, isActive && activeDirection === "desc" ? "asc" : "desc")
      }
    >
      <span>{title}</span>
      {!isActive ? (
        <ChevronsUpDown className="text-muted-foreground" />
      ) : activeDirection === "desc" ? (
        <ArrowDown />
      ) : (
        <ArrowUp />
      )}
    </Button>
  );
}
