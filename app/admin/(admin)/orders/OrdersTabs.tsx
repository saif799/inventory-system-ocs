"use client";

import { Package, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTableParams } from "./useTableParams";
import type { Tab } from "./params";

/**
 * Both tabs share one unprefixed set of URL params, so switching tabs clears
 * them rather than restoring whatever the other tab was last filtered by.
 */
export function OrdersTabs({ activeTab }: { activeTab: Tab }) {
  const { replaceAllParams } = useTableParams();
  const isOnline = activeTab === "online";

  return (
    <div className="mb-4 inline-flex rounded-lg border bg-muted/40 p-1">
      <Button
        variant={isOnline ? "default" : "ghost"}
        size="sm"
        onClick={() => replaceAllParams({})}
        className="gap-2"
      >
        <Package className="h-4 w-4" />
        Online orders
      </Button>
      <Button
        variant={!isOnline ? "default" : "ghost"}
        size="sm"
        onClick={() => replaceAllParams({ tab: "store" })}
        className="gap-2"
      >
        <Store className="h-4 w-4" />
        Store sales
      </Button>
    </div>
  );
}
