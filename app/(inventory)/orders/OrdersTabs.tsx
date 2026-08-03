"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { InferSelectModel } from "drizzle-orm";
import { Package, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { stautsGroupsTable } from "@/lib/schema";
import { DataTable } from "./data-table";
import { OrderType } from "./columns";
import { StoreSalesTable, StoreSaleRow } from "./StoreSalesTable";

type Tab = "online" | "store";

interface OrdersTabsProps {
  columns: ColumnDef<OrderType, unknown>[];
  orders: OrderType[];
  statuses: InferSelectModel<typeof stautsGroupsTable>[];
  storeSales: StoreSaleRow[];
}

export function OrdersTabs({
  columns,
  orders,
  statuses,
  storeSales,
}: OrdersTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("online");
  const isOnline = activeTab === "online";

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border p-1 bg-muted/40">
        <Button
          variant={isOnline ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("online")}
          className="gap-2"
        >
          <Package className="h-4 w-4" />
          Online orders
          <Badge variant={isOnline ? "secondary" : "outline"}>
            {orders.length}
          </Badge>
        </Button>
        <Button
          variant={!isOnline ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("store")}
          className="gap-2"
        >
          <Store className="h-4 w-4" />
          Store sales
          <Badge variant={!isOnline ? "secondary" : "outline"}>
            {storeSales.length}
          </Badge>
        </Button>
      </div>

      {isOnline ? (
        <DataTable columns={columns} data={orders} Statuses={statuses} />
      ) : (
        <StoreSalesTable data={storeSales} />
      )}
    </div>
  );
}
