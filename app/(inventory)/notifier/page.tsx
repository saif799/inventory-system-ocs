"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2, Check, ImageOff, ImagePlus } from "lucide-react";
import { toast } from "sonner";

type Direction = "remove" | "restock";

type NotifierItem = {
  id: string;
  shoeInventoryId: string;
  direction: Direction;
  createdAt: string;
  size: string;
  quantity: number;
  shoeId: string;
  color: string;
  hexCode: string;
  modelName: string;
  orderId: string | null;
  customerName: string | null;
  orderReference: string | null;
};

// One row per size-variant, collapsing any duplicate notifier rows for it.
type VariantCell = {
  shoeInventoryId: string;
  size: string;
  quantity: number;
  orderId: string | null;
  customerName: string | null;
  orderReference: string | null;
  ids: string[]; // every underlying notifier row id for this variant
};

type ProductGroup = {
  shoeId: string;
  modelName: string;
  color: string;
  hexCode: string;
  cells: VariantCell[];
};

export default function NotifierPage() {
  const [notifiers, setNotifiers] = useState<NotifierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Direction>("remove");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifiers();
  }, []);

  const fetchNotifiers = async () => {
    try {
      const response = await fetch("/api/notifier");
      if (!response.ok) {
        throw new Error("Failed to fetch notifiers");
      }
      const data = await response.json();
      setNotifiers(data);
    } catch (error) {
      console.error("Error fetching notifiers:", error);
      toast.error("Failed to load the notifier");
    } finally {
      setLoading(false);
    }
  };

  const removeCount = useMemo(
    () =>
      new Set(
        notifiers
          .filter((n) => n.direction === "remove")
          .map((n) => n.shoeInventoryId)
      ).size,
    [notifiers]
  );
  const restockCount = useMemo(
    () =>
      new Set(
        notifiers
          .filter((n) => n.direction === "restock")
          .map((n) => n.shoeInventoryId)
      ).size,
    [notifiers]
  );

  // Group the active tab's items into one card per product (model + color),
  // and within each product collapse duplicate rows down to one per size.
  const groups = useMemo<ProductGroup[]>(() => {
    const groupMap = new Map<string, ProductGroup>();
    const cellMap = new Map<string, VariantCell>();

    for (const item of notifiers) {
      if (item.direction !== activeTab) continue;

      let group = groupMap.get(item.shoeId);
      if (!group) {
        group = {
          shoeId: item.shoeId,
          modelName: item.modelName,
          color: item.color,
          hexCode: item.hexCode,
          cells: [],
        };
        groupMap.set(item.shoeId, group);
      }

      let cell = cellMap.get(item.shoeInventoryId);
      if (!cell) {
        cell = {
          shoeInventoryId: item.shoeInventoryId,
          size: item.size,
          quantity: item.quantity,
          orderId: item.orderId,
          customerName: item.customerName,
          orderReference: item.orderReference,
          ids: [],
        };
        cellMap.set(item.shoeInventoryId, cell);
        group.cells.push(cell);
      }
      cell.ids.push(item.id);
    }

    return Array.from(groupMap.values());
  }, [notifiers, activeTab]);

  const setBusy = (ids: string[], busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (busy ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  // Deletes every underlying notifier row for the given ids in one request.
  const dismissIds = async (ids: string[], successMsg?: string) => {
    setBusy(ids, true);
    try {
      const response = await fetch("/api/notifier", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to dismiss");
      }
      const idSet = new Set(ids);
      setNotifiers((prev) => prev.filter((item) => !idSet.has(item.id)));
      if (successMsg) toast.success(successMsg);
    } catch (error) {
      toast.error((error as Error).message || "Failed to dismiss");
    } finally {
      setBusy(ids, false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isRemove = activeTab === "remove";

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gallery Sync</h1>
        <p className="text-muted-foreground">
          Keep your gallery in sync with your stock — remove what just sold out,
          add back what came back in stock.
        </p>
      </div>

      {/* Segmented toggle between the two directions */}
      <div className="mb-6 inline-flex rounded-lg border p-1 bg-muted/40">
        <Button
          variant={isRemove ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("remove")}
          className="gap-2"
        >
          <ImageOff className="h-4 w-4" />
          Remove from gallery
          <Badge variant={isRemove ? "secondary" : "outline"}>
            {removeCount}
          </Badge>
        </Button>
        <Button
          variant={!isRemove ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("restock")}
          className="gap-2"
        >
          <ImagePlus className="h-4 w-4" />
          Add back
          <Badge variant={!isRemove ? "secondary" : "outline"}>
            {restockCount}
          </Badge>
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">
            {isRemove
              ? "Nothing to remove — your gallery is up to date."
              : "Nothing to add back right now."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const groupIds = group.cells.flatMap((c) => c.ids);
            const groupBusy = groupIds.every((id) => busyIds.has(id));
            return (
              <Card key={group.shoeId} className="gap-3 py-4">
                <CardHeader className="px-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-5 w-5 shrink-0 rounded-full border"
                      style={{ backgroundColor: group.hexCode }}
                      title={group.color}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {group.modelName}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {group.color}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 space-y-2">
                  {group.cells.map((cell) => (
                    <div
                      key={cell.shoeInventoryId}
                      className="flex items-start justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            Size {cell.size}
                          </span>
                          <Badge variant={isRemove ? "destructive" : "success"}>
                            {cell.quantity} in stock
                          </Badge>
                        </div>
                        {!isRemove &&
                          (cell.orderReference || cell.customerName) && (
                            <div className="mt-1 text-xs text-muted-foreground truncate">
                              {cell.orderReference
                                ? `Order ${cell.orderReference}`
                                : `Order ${cell.orderId}`}
                              {cell.customerName ? ` · ${cell.customerName}` : ""}
                            </div>
                          )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissIds(cell.ids)}
                        disabled={cell.ids.every((id) => busyIds.has(id))}
                        className="h-7 w-7 p-0 shrink-0 text-muted-foreground"
                        title="Dismiss this size"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissIds(groupIds, "Product marked done")}
                    disabled={groupBusy}
                    className="w-full mt-1 gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Mark product done
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
