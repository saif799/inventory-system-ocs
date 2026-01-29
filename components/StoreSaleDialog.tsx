"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { GroupedProduct } from "@/app/(inventory)/page";

interface StoreSaleDialogProps {
  product: GroupedProduct;
  setIsStoreSaleOpen: (isOpen: boolean) => void;
 
}

export default function StoreSaleDialog({setIsStoreSaleOpen,
  product: { modelName, color, sizes },
}: StoreSaleDialogProps) {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availableSizes = sizes.filter((s) => s.quantity > 0);

  const handleSale = async () => {
    if (!selectedSize) {
      alert("Please select a size");
      return;
    }

    const sizeData = sizes.find((s) => s.size === selectedSize);
    if (!sizeData) {
      alert("Invalid size selected");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/store-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: sizeData.inventoryId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process sale");
      }

      setSelectedSize(null);
      toast.success("Sale recorded successfully");
      setIsStoreSaleOpen(false)
      router.refresh();
    } catch (error) {
      console.error("Failed to process sale:", error);
      toast.error("Failed to process sale. Please try again.");
    } finally {
      setIsSaving(false);

    }
  };

  return (
    <DialogContent
    className="w-[calc(100%-1rem)] max-w-[calc(100vw-2rem)] sm:max-w-lg  overflow-y-auto overflow-x-hidden p-4 sm:p-6 transition-all duration-300"
    style={{ boxSizing: "border-box" }}
    onClick={(e) => e.stopPropagation()}
  >
    <DialogHeader>
      <DialogTitle className="text-xl sm:text-2xl pr-10">Store Sale</DialogTitle>
      <DialogDescription className="text-base">
        Record a sale for {modelName} - {color}
      </DialogDescription>
    </DialogHeader>
    <div className="w-full space-y-6 mt-6 min-w-0">
      {availableSizes.length === 0 ? (
        <p className="text-base text-gray-500 text-center py-6">
          No available sizes in stock
        </p>
      ) : (
        <>
          <div className="space-y-3 min-w-0">
            <p className="text-base font-medium">Select Size:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableSizes.map((size) => (
                <Button
                  key={size.inventoryId}
                  variant={selectedSize === size.size ? "default" : "outline"}
                  onClick={() => {
                    setSelectedSize(size.size);
                  }}
                  className="w-full min-h-14 text-base flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-4 px-4"
                >
                  <span>{size.size}</span>
                  <span className="text-sm opacity-70">
                    (Qty: {size.quantity})
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSize(null);
                setIsStoreSaleOpen(false)
              }}
              disabled={isSaving}
              className="w-full sm:w-auto min-h-14 text-base px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSale}
              disabled={isSaving || !selectedSize}
              className="w-full sm:w-auto min-h-14 text-base px-6"
            >
              {isSaving ? "Processing..." : "Confirm Sale"}
            </Button>
          </div>
        </>
      )}
    </div>
  </DialogContent>
  );
}
