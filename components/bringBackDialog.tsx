"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { GroupedProduct } from "@/app/(inventory)/page";

interface BringBackDialogProps {
  product: GroupedProduct;
  borrowerId: string;
  setIsBringBackOpen: (isOpen: boolean) => void;
}

export default function BringBackDialog({
  product: { modelName, color, sizes },
  borrowerId,
  setIsBringBackOpen,
}: BringBackDialogProps) {
  const router = useRouter();
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const selectedSizeData = useMemo(
    () => sizes.find((s) => s.inventoryId === selectedInventoryId),
    [sizes, selectedInventoryId],
  );

  const handleBringBack = async () => {
    if (!selectedSizeData) {
      toast.error("Please select a size");
      return;
    }

    const safeQuantity = Math.max(1, Math.floor(quantity));
    if (safeQuantity > selectedSizeData.quantity) {
      toast.error("Quantity cannot exceed lended quantity");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/lended-shoes/bring-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrowerId,
          inventoryId: selectedSizeData.inventoryId,
          quantity: safeQuantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to bring back inventory");
      }

      toast.success("Inventory brought back successfully");
      setIsBringBackOpen(false);
      setSelectedInventoryId(null);
      setQuantity(1);
      router.refresh();
    } catch (error) {
      console.error("Failed to bring back inventory:", error);
      toast.error("Failed to bring back inventory. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent
      className="w-[calc(100%-1rem)] max-w-[calc(100vw-2rem)] sm:max-w-lg overflow-y-auto overflow-x-hidden p-4 sm:p-6 transition-all duration-300"
      style={{ boxSizing: "border-box" }}
      onClick={(e) => e.stopPropagation()}
    >
      <DialogHeader>
        <DialogTitle className="text-xl sm:text-2xl pr-10">
          Bring Back Product
        </DialogTitle>
        <DialogDescription className="text-base">
          Confirm returned stock for {modelName} - {color}
        </DialogDescription>
      </DialogHeader>

      <div className="w-full space-y-6 mt-6 min-w-0">
        <div className="space-y-3 min-w-0">
          <p className="text-base font-medium">Select Size:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sizes.map((size) => (
              <Button
                key={size.inventoryId}
                variant={
                  selectedInventoryId === size.inventoryId ? "default" : "outline"
                }
                onClick={() => {
                  setSelectedInventoryId(size.inventoryId);
                  if (quantity > size.quantity) {
                    setQuantity(size.quantity);
                  }
                }}
                className="w-full min-h-14 text-base flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-4 px-4"
              >
                <span>{size.size}</span>
                <span className="text-sm opacity-70">(Lended: {size.quantity})</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-quantity">Return Quantity</Label>
          <Input
            id="return-quantity"
            type="number"
            min={1}
            max={selectedSizeData?.quantity ?? 1}
            value={quantity}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              if (Number.isNaN(parsed) || parsed < 1) {
                setQuantity(1);
                return;
              }
              const max = selectedSizeData?.quantity ?? parsed;
              setQuantity(Math.min(parsed, max));
            }}
            disabled={!selectedSizeData}
            onClick={(e) => e.stopPropagation()}
          />
          {selectedSizeData && (
            <p className="text-xs text-gray-500">
              Max return for selected size: {selectedSizeData.quantity}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedInventoryId(null);
              setQuantity(1);
              setIsBringBackOpen(false);
            }}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-14 text-base px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleBringBack}
            disabled={isSaving || !selectedInventoryId}
            className="w-full sm:w-auto min-h-14 text-base px-6"
          >
            {isSaving ? "Saving..." : "Confirm Bring Back"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
