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
import InventoryTransferDialog, {
  type TransferLine,
} from "./InventoryTransferDialog";
import { GroupedProduct } from "@/app/admin/(admin)/page";
import { Button, buttonVariants } from "./ui/button";
import {
  Handshake,
  MoreHorizontal,
  Package,
  Pencil,
  ShoppingCart,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { storeHeldStock } from "@/lib/stock/availability";

interface ProductCardProps {
  product: GroupedProduct;
  selectedShoes?: Array<{ id: string }>;
  selectshoe: (id: string, identifier: string) => void;
  borrowerName?: string;
}

export default function ProductCard({
  product: { modelId, modelName, color, sizes, shoeId, archived },
  selectedShoes,
  selectshoe,
  borrowerName,
}: ProductCardProps) {
  const router = useRouter();
  const params = useParams<{ lenderId?: string }>();
  const lenderId = params?.lenderId;
  const isBorrowerView = Boolean(lenderId);
  const [isStoreSaleOpen, setIsStoreSaleOpen] = useState(false);
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false);
  const [isLendInventoryOpen, setIsLendInventoryOpen] = useState(false);
  const [isBringBackOpen, setIsBringBackOpen] = useState(false);
  const [lendLines, setLendLines] = useState<TransferLine[]>([]);

  // Lendable qty per size accounts for stock already lent elsewhere, so it
  // has to be fetched fresh each time the lend dialog opens.
  useEffect(() => {
    if (!isLendInventoryOpen) return;
    let ignore = false;
    const inventoryIds = sizes.map((s) => s.inventoryId).join(",");
    if (!inventoryIds) return;

    fetch(`/api/lended-shoes?inventoryIds=${encodeURIComponent(inventoryIds)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { inventoryId: string; lentQuantity: number }[]) => {
        if (ignore) return;
        const lentById = new Map(
          data.map((r) => [r.inventoryId, Number(r.lentQuantity)]),
        );
        setLendLines(
          sizes
            .map((s) => {
              const lent = lentById.get(s.inventoryId) ?? 0;
              const lendable = storeHeldStock(s.quantity, lent);
              return {
                inventoryId: s.inventoryId,
                modelName,
                color,
                size: s.size,
                maxQty: lendable,
                helperText:
                  lent > 0
                    ? `${lendable} lendable · ${lent} already lent`
                    : `${lendable} in stock`,
              };
            })
            .filter((line) => line.maxQty > 0),
        );
      })
      .catch(() => {
        if (!ignore) setLendLines([]);
      });

    return () => {
      ignore = true;
    };
  }, [isLendInventoryOpen, sizes, modelName, color]);

  const bringBackLines: TransferLine[] = sizes.map((s) => ({
    inventoryId: s.inventoryId,
    modelName,
    color,
    size: s.size,
    maxQty: s.quantity,
    helperText: `${s.quantity} held`,
  }));

  return (
    <div
      onClick={() => selectshoe(shoeId, modelName + color + sizes[0].size)}
      aria-pressed={
        selectedShoes?.some((shoe) => shoe.id === shoeId) ? "true" : "false"
      }
      className={cn(
        "flex w-full flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md focus:outline-none",
        archived && "opacity-60",
        // show a visible ring when selected
        selectedShoes?.some((shoe) => shoe.id === shoeId)
          ? "ring-2 ring-purple-500/50 ring-offset-2"
          : "",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {modelName}
            {archived && (
              <span className="ml-2 rounded border border-gray-300 px-1.5 py-0.5 align-middle text-[10px] font-medium text-gray-500">
                archivé
              </span>
            )}
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
          <Dialog>
            <DialogTrigger
              onClick={(e) => e.stopPropagation()}
              className={buttonVariants({
                variant: "outline",
                className: "flex items-center",
                size: "icon",
              })}
            >
              <Package className="h-3 w-3" />
              {/* <span>order</span> */}
            </DialogTrigger>
            <DialogContent
              className="w-full max-w-full sm:max-w-xl transition-all duration-300 max-h-[80vh] overflow-y-auto overflow-x-hidden px-2 md:p-6"
              style={{ boxSizing: "border-box" }}
            >
              <DialogHeader>
                <DialogTitle>add an Order</DialogTitle>
                <DialogDescription>
                  {isBorrowerView
                    ? "Order from this borrower's stock (defaults to Yalidine)"
                    : "enter the client info"}
                </DialogDescription>
              </DialogHeader>
              <div className="w-full">
                <SendOrderForm
                  shoe={{ shoeId, modelId, modelName, color, sizes }}
                  borrowerId={isBorrowerView ? lenderId : undefined}
                />
              </div>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {isBorrowerView && lenderId ? (
                <DropdownMenuItem onClick={() => setIsBringBackOpen(true)}>
                  <Dialog
                    open={isBringBackOpen}
                    onOpenChange={setIsBringBackOpen}
                  >
                    <DialogTrigger
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1"
                    >
                      <Undo2 className="h-3 w-3" /> Bring Back
                    </DialogTrigger>
                    <InventoryTransferDialog
                      open={isBringBackOpen}
                      onOpenChange={setIsBringBackOpen}
                      lines={bringBackLines}
                      target={{
                        mode: "return",
                        borrowerId: lenderId,
                        borrowerName: borrowerName ?? "this borrower",
                      }}
                      onSuccess={() => router.refresh()}
                    />
                  </Dialog>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => setIsStoreSaleOpen(true)}>
                    <Dialog
                      open={isStoreSaleOpen}
                      onOpenChange={setIsStoreSaleOpen}
                    >
                      <DialogTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1"
                      >
                        <ShoppingCart className="h-3 w-3 " /> Store Sale
                      </DialogTrigger>
                      <StoreSaleDialog
                        product={{
                          modelId,
                          modelName,
                          color,
                          sizes,
                          shoeId,
                        }}
                        setIsStoreSaleOpen={setIsStoreSaleOpen}
                      />
                    </Dialog>{" "}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setIsLendInventoryOpen(true)}
                  >
                    <Dialog
                      open={isLendInventoryOpen}
                      onOpenChange={setIsLendInventoryOpen}
                    >
                      <DialogTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1"
                      >
                        <Handshake className="h-3 w-3" /> Lend
                      </DialogTrigger>
                      <InventoryTransferDialog
                        open={isLendInventoryOpen}
                        onOpenChange={setIsLendInventoryOpen}
                        lines={lendLines}
                        target={{ mode: "lend" }}
                        emptyText="No available sizes in stock."
                        onSuccess={() => router.refresh()}
                      />
                    </Dialog>
                  </DropdownMenuItem>

                  <DropdownMenuItem>
                    <Dialog
                      open={isEditInventoryOpen}
                      onOpenChange={setIsEditInventoryOpen}
                    >
                      <DialogTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </DialogTrigger>
                      <EditInventoryDialog
                        product={{
                          modelId,
                          modelName,
                          color,
                          sizes,
                          shoeId,
                        }}
                        setIsEditInventoryOpen={setIsEditInventoryOpen}
                      />
                    </Dialog>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a
                      href={`/admin/products/${shoeId}/edit`}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <Package className="h-3 w-3" /> Edit Product (Pricing
                      &amp; Images)
                    </a>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
