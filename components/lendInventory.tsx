"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupedProduct } from "@/app/(inventory)/page";

type Borrower = {
  id: string;
  name: string;
};

type LendedSummaryRow = {
  inventoryId: string;
  lentQuantity: number;
};

interface LendInventoryDialogProps {
  product: GroupedProduct;
  setIsLendInventoryOpen: (isOpen: boolean) => void;
}

export default function LendInventoryDialog({
  product: { modelName, color, sizes },
  setIsLendInventoryOpen,
}: LendInventoryDialogProps) {
  const router = useRouter();
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [lentByInventoryId, setLentByInventoryId] = useState<Record<string, number>>(
    {},
  );
  const [isLoadingBorrowers, setIsLoadingBorrowers] = useState(false);
  const [isLoadingLentSummary, setIsLoadingLentSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sizesWithLending = useMemo(
    () =>
      sizes.map((s) => {
        const lentQuantity = lentByInventoryId[s.inventoryId] ?? 0;
        const lendableQuantity = Math.max(0, s.quantity - lentQuantity);
        return {
          ...s,
          lentQuantity,
          lendableQuantity,
        };
      }),
    [sizes, lentByInventoryId],
  );

  const availableSizes = useMemo(
    () => sizesWithLending.filter((s) => s.lendableQuantity > 0),
    [sizesWithLending],
  );

  const selectedSizeData = useMemo(
    () => availableSizes.find((s) => s.inventoryId === selectedInventoryId),
    [availableSizes, selectedInventoryId],
  );

  useEffect(() => {
    let ignore = false;

    const loadBorrowers = async () => {
      setIsLoadingBorrowers(true);
      try {
        const response = await fetch("/api/borrowers");
        if (!response.ok) {
          throw new Error("Failed to load borrowers");
        }
        const data = (await response.json()) as Borrower[];
        if (!ignore) {
          setBorrowers(data);
        }
      } catch (error) {
        console.error("Failed to load borrowers:", error);
        toast.error("Unable to load borrower list");
      } finally {
        if (!ignore) {
          setIsLoadingBorrowers(false);
        }
      }
    };

    const loadLendedSummary = async () => {
      const inventoryIds = sizes.map((s) => s.inventoryId).join(",");
      if (!inventoryIds) {
        return;
      }

      setIsLoadingLentSummary(true);
      try {
        const response = await fetch(
          `/api/lended-shoes?inventoryIds=${encodeURIComponent(inventoryIds)}`,
        );
        if (!response.ok) {
          throw new Error("Failed to load lended summary");
        }
        const data = (await response.json()) as LendedSummaryRow[];
        if (!ignore) {
          const lentMap: Record<string, number> = {};
          data.forEach((row) => {
            lentMap[row.inventoryId] = Number(row.lentQuantity ?? 0);
          });
          setLentByInventoryId(lentMap);
        }
      } catch (error) {
        console.error("Failed to load lended summary:", error);
        toast.error("Unable to load lended quantities");
      } finally {
        if (!ignore) {
          setIsLoadingLentSummary(false);
        }
      }
    };

    void Promise.all([loadBorrowers(), loadLendedSummary()]);

    return () => {
      ignore = true;
    };
  }, [sizes]);

  const handleLend = async () => {
    if (!selectedSizeData) {
      toast.error("Please select a size");
      return;
    }

    const cleanBorrowerName = borrowerName.trim();
    if (!cleanBorrowerName) {
      toast.error("Please enter a borrower name");
      return;
    }

    const safeQuantity = Math.max(1, Math.floor(quantity));
    if (safeQuantity > selectedSizeData.lendableQuantity) {
      toast.error("Quantity cannot exceed available stock");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/lended-shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: selectedSizeData.inventoryId,
          borrowerName: cleanBorrowerName,
          quantity: safeQuantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to lend inventory");
      }

      toast.success("Inventory assigned to borrower");
      setIsLendInventoryOpen(false);
      setSelectedInventoryId(null);
      setBorrowerName("");
      setQuantity(1);
      router.refresh();
    } catch (error) {
      console.error("Failed to lend inventory:", error);
      toast.error("Failed to assign inventory. Please try again.");
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
          Lend Inventory
        </DialogTitle>
        <DialogDescription className="text-base">
          Assign stock for {modelName} - {color} to a borrower
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
                    variant={
                      selectedInventoryId === size.inventoryId
                        ? "default"
                        : "outline"
                    }
                    onClick={() => {
                      setSelectedInventoryId(size.inventoryId);
                      if (quantity > size.lendableQuantity) {
                        setQuantity(size.lendableQuantity);
                      }
                    }}
                    className="w-full min-h-14 text-base flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-4 px-4"
                  >
                    <span>{size.size}</span>
                    <span className="text-sm opacity-70">(Qty: {size.quantity})</span>
                  </Button>
                ))}
              </div>
            </div>

            {selectedSizeData && (
              <p className="text-xs text-amber-700">
                Lended for selected size ({selectedSizeData.size}):{" "}
                {selectedSizeData.lentQuantity}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="lend-quantity">Quantity</Label>
              <Input
                id="lend-quantity"
                type="number"
                min={1}
                max={selectedSizeData?.lendableQuantity ?? 1}
                value={quantity}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  if (Number.isNaN(parsed) || parsed < 1) {
                    setQuantity(1);
                    return;
                  }
                  const max = selectedSizeData?.lendableQuantity ?? parsed;
                  setQuantity(Math.min(parsed, max));
                }}
                disabled={!selectedSizeData}
                onClick={(e) => e.stopPropagation()}
              />
              {selectedSizeData && (
                <p className="text-xs text-gray-500">
                  Max available to lend for this size: {selectedSizeData.lendableQuantity}
                  {" "}({selectedSizeData.lentQuantity} lended out of{" "}
                  {selectedSizeData.quantity} total)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="borrower-name">Borrower Name</Label>
              <Select
                disabled={isLoadingBorrowers || borrowers.length === 0}
                value={borrowerName}
                onValueChange={setBorrowerName}
              >
                <SelectTrigger id="borrower-name" className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingBorrowers
                        ? "Loading borrowers..."
                        : borrowers.length === 0
                          ? "No borrowers found"
                          : "Select borrower"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {borrowers.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedInventoryId(null);
                  setBorrowerName("");
                  setQuantity(1);
                  setIsLendInventoryOpen(false);
                }}
                disabled={isSaving}
                className="w-full sm:w-auto min-h-14 text-base px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLend}
                disabled={
                  isSaving ||
                  isLoadingLentSummary ||
                  !selectedInventoryId ||
                  !borrowerName.trim()
                }
                className="w-full sm:w-auto min-h-14 text-base px-6"
              >
                {isSaving ? "Assigning..." : "Assign to Borrower"}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogContent>
  );
}
