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
import LendInventoryDialog from "./lendInventory";
import BringBackDialog from "./bringBackDialog";
import { GroupedProduct } from "@/app/(inventory)/page";
import { Button, buttonVariants } from "./ui/button";
import {
  Handshake,
  MoreHorizontal,
  Package,
  Pencil,
  ShoppingCart,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HexColorPicker } from "react-colorful";
import { Input } from "./ui/input";
import { toast } from "sonner";

interface ProductCardProps {
  product: GroupedProduct;
  selectedShoes?: Array<{ id: string }>;
  selectshoe: (id: string, identifier: string) => void;
}

export default function ProductCard({
  product: { modelId, modelName, color, sizes, shoeId, hexCode },
  selectedShoes,
  selectshoe,
}: ProductCardProps) {
  const router = useRouter();
  const params = useParams<{ lenderId?: string }>();
  const lenderId = params?.lenderId;
  const isBorrowerView = Boolean(lenderId);
  const [isStoreSaleOpen, setIsStoreSaleOpen] = useState(false);
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false);
  const [isLendInventoryOpen, setIsLendInventoryOpen] = useState(false);
  const [isBringBackOpen, setIsBringBackOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [localHexCode, setLocalHexCode] = useState(hexCode || "#FFFFFF");
  const [isSavingHexCode, setIsSavingHexCode] = useState(false);

  const handleHexCodeSave = async () => {
    const formattedHex = localHexCode.trim().toUpperCase();

    if (!/^#([0-9A-F]{6})$/.test(formattedHex)) {
      toast.error("Please use a valid hex code like #A1B2C3.");
      return;
    }

    setIsSavingHexCode(true);
    try {
      const response = await fetch(`/api/shoes/${shoeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hexCode: formattedHex }),
      });

      if (!response.ok) {
        throw new Error("Failed to save shoe color.");
      }

      toast.success("Shoe color updated.");
      router.refresh();
      setIsColorPickerOpen(false);
    } catch (error) {
      console.error("Failed to update shoe hex color:", error);
      toast.error("Could not update shoe color.");
    } finally {
      setIsSavingHexCode(false);
    }
  };
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
          : "",
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
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsColorPickerOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <span
                className="inline-block h-4 w-4 rounded-full border border-gray-300"
                style={{ backgroundColor: localHexCode }}
              />
              {localHexCode.toUpperCase()}
            </button>
            {isColorPickerOpen && (
              <div className="mt-2 space-y-2 rounded-md border border-gray-200 bg-white p-2 shadow-md">
                <HexColorPicker
                  color={localHexCode}
                  onChange={setLocalHexCode}
                />
                <div className="flex items-center gap-2">
                  <Input
                    value={localHexCode.toUpperCase()}
                    onChange={(e) => setLocalHexCode(e.target.value)}
                    className="h-8 text-xs"
                    maxLength={7}
                  />
                  <Button
                    size="sm"
                    onClick={handleHexCodeSave}
                    disabled={isSavingHexCode}
                  >
                    {isSavingHexCode ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
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
                  shoe={{ shoeId, modelId, modelName, color, hexCode, sizes }}
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
                    <BringBackDialog
                      product={{
                        modelId,
                        modelName,
                        color,
                        hexCode,
                        sizes,
                        shoeId,
                      }}
                      borrowerId={lenderId}
                      setIsBringBackOpen={setIsBringBackOpen}
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
                          hexCode,
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
                      <LendInventoryDialog
                        product={{
                          modelId,
                          modelName,
                          color,
                          hexCode,
                          sizes,
                          shoeId,
                        }}
                        setIsLendInventoryOpen={setIsLendInventoryOpen}
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
                          hexCode,
                          sizes,
                          shoeId,
                        }}
                        setIsEditInventoryOpen={setIsEditInventoryOpen}
                      />
                    </Dialog>
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
