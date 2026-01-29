"use client";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SendOrderForm from "./sendShoeOrder";
import EditInventoryDialog from "./EditInventoryDialog";
import StoreSaleDialog from "./StoreSaleDialog";
import { GroupedProduct } from "@/app/(inventory)/page";
import { Button} from "./ui/button";
import { MoreHorizontal, Package, Pencil, ShoppingCart } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  product: GroupedProduct;
  selectedShoes?: Array<{ id: string }>;
  selectshoe: (id: string, identifier: string) => void;
}

export default function ProductCard({
  product: { modelId, modelName, color, sizes, shoeId },
  selectedShoes,
  selectshoe,
}: ProductCardProps) {
  const [isStoreSaleOpen, setIsStoreSaleOpen] = useState(false);
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false);
  return (
    <div
      onClick={() => selectshoe(shoeId, modelName + color + sizes[0].size)}
      aria-pressed={
        selectedShoes?.some((shoe) => shoe.id === shoeId) ? "true" : "false"
      }
      className={cn(
        "flex w-full flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md focus:outline-none",
        // show a visible ring when selected
        selectedShoes?.some((shoe) => shoe.id === shoeId)
          ? "ring-2 ring-purple-500/50 ring-offset-2"
          : ""
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {modelName}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{color}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">Size</p>
          <p className="mt-1 rounded-md bg-gray-100 px-1 py-1 text-xs font-medium text-gray-700 whitespace-normal wrap-break-word">
            {sizes.map((s) => s.size).join(", ")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-600">Quantity</p>
            <p className="text-sm font-medium text-gray-800">
              {sizes.reduce((total, s) => total + s.quantity, 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            >
          <Dialog>
            <DialogTrigger
              onClick={(e) => e.stopPropagation()}
               className="flex items-center gap-1"
            >
           <Package className="h-3 w-3" />    <span >Add an order</span>
            </DialogTrigger>
            <DialogContent
              className="w-full max-w-full sm:max-w-xl transition-all duration-300 max-h-[80vh] overflow-y-auto overflow-x-hidden px-2 md:p-6"
              style={{ boxSizing: "border-box" }}
            >
              <DialogHeader>
                <DialogTitle>add an Order</DialogTitle>
                <DialogDescription>enter the client info</DialogDescription>
              </DialogHeader>
              <div className="w-full">
                <SendOrderForm
                  shoe={{ shoeId, modelId, modelName, color, sizes }}
                />
              </div>
            </DialogContent>
          </Dialog>            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
            onClick={() => setIsStoreSaleOpen(true)}
            >
 <Dialog open={isStoreSaleOpen} onOpenChange={setIsStoreSaleOpen} >
      <DialogTrigger onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
          <ShoppingCart className="h-3 w-3 " /> Store Sale
         
      </DialogTrigger>
      <StoreSaleDialog product={{ modelId, modelName, color, sizes, shoeId }} setIsStoreSaleOpen={setIsStoreSaleOpen} />

      
    </Dialog>          </DropdownMenuItem>

          <DropdownMenuItem>
          <Dialog open={isEditInventoryOpen} onOpenChange={setIsEditInventoryOpen} >
      <DialogTrigger onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
          <Pencil className="h-3 w-3" /> Edit
         
      </DialogTrigger>
      <EditInventoryDialog product={{ modelId, modelName, color, sizes, shoeId }} setIsEditInventoryOpen={setIsEditInventoryOpen} />

      
    </Dialog>

          </DropdownMenuItem>

           
          </DropdownMenuContent>
        </DropdownMenu>

          
        </div>
      </div>
    </div>
  );
}
