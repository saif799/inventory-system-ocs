"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Map, MoreHorizontal, MapPin, House } from "lucide-react";
import wilayas from "@/wilayas.json";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InferSelectModel } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "./data-table-column-header";
import { ordersTable } from "@/lib/schema";
import { Checkbox } from "@/components/ui/checkbox";
// import { markAsLivre, markAsRetour } from "@/lib/helpers";
// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export type OrderType = InferSelectModel<typeof ordersTable>;

export const columnsOrder: ColumnDef<OrderType>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "nom_client",
    header: "Client Information",
    cell: ({ row }) => {
      return (
        <>
          <div>{row.original.nom_client}</div>
          <div>{row.original.telephone}</div>
        </>
      );
    },
    filterFn: "includesString",
  },

  {
    accessorKey: "adresse",
    header: "Adresse",
    cell: ({ row }) => {
      return (
        <>
          <div className="flex items-center gap-1">
            <Map size={14} />
            {
              wilayas.find(
                (w) => w.wilaya_id === Number(row.original.code_wilaya)
              )?.wilaya_name
            }
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            {row.original.commune}
          </div>
          <div className="flex items-center gap-1">
            <House size={14} />
            {row.original.adresse}
          </div>
        </>
      );
    },
  },
  {
    accessorKey: "reference",
    filterFn: "includesString",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Reference" />;
    },
  },
  {
    accessorKey: "montant",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Price" />;
    },
    cell: ({ row }) => {
      return <div className=" font-medium">{row.getValue("montant")} DA</div>;
    },
  },

  {
    accessorKey: "telephone",
    header: "Telephone",
    filterFn: "equals",
  },

  //todo edit this later to be not visible by default
  // todo make sure to unisntall the badge compoent
  {
    accessorKey: "statusId",
    header: "Status",

    cell: ({ row }) => {
      return (
        <Badge
          variant={
            row.getValue("statusId") === "prete_a_expedier"
              ? "onDelivery"
              : "outline"
          }
        >
          {row.getValue("statusId")}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.telephone)}
            >
              Copy Livreur Number
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                if (!confirm("Are you sure you want to delete this order?"))
                  return;
                try {
                  //trackingId, orderId, shoeInventoryId
                  const res = await fetch("/api/order", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orderId: order.id,
                      shoeInventoryId: order.shoeInventoryId,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.message || "Failed to delete order");
                  }
                  window.location.reload();
                } catch (err) {
                  alert((err as Error).message || "Failed to delete order");
                }
              }}
            >
              Delete
            </DropdownMenuItem>

            {/* <DropdownMenuItem
              onClick={async () => {
                markAsLivre(order.id);
              }}
            >
              livre
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                markAsRetour(order.id);
              }}
            >
              retour
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
