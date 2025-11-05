"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, PlusCircle, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddShoeForm from "@/components/AddShoeForm";
type SortKey = "model" | "quantity" | "size";

type InventoryRow = {
  id: string;
  modelName: string;
  color: string;
  size: string;
  quantity: number;
};

export default function InventoryTable({
  q,
  sort,
  filteredInventory,
  scanBarcodeAction,
  decreaseQuantityAction,
  deleteItemAction,
}: {
  q: string;
  sort?: SortKey;
  filteredInventory: InventoryRow[];
  scanBarcodeAction: (formData: FormData) => Promise<void>;
  decreaseQuantityAction: (formData: FormData) => Promise<void>;
  deleteItemAction: (formData: FormData) => Promise<void>;
}) {
  const [localSort, setLocalSort] = useState<SortKey>(sort ?? "model");
  const [selectedItems, setSelectedItems] = useState<Array<InventoryRow>>([]);

  const items = [...filteredInventory];
  items.sort((a, b) => {
    if (localSort === "model") return a.modelName.localeCompare(b.modelName);
    if (localSort === "quantity") return b.quantity - a.quantity;
    if (localSort === "size") {
      const an = Number.parseFloat(a.size);
      const bn = Number.parseFloat(b.size);
      const aNum = Number.isFinite(an);
      const bNum = Number.isFinite(bn);
      if (aNum && bNum) return an - bn;
      if (aNum) return -1;
      if (bNum) return 1;
      return a.size.localeCompare(b.size);
    }
    return 0;
  });
  const sortedInventory = items;

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-white">Barcode Scanner</CardTitle>
          <CardDescription className="text-slate-400">
            Scan a barcode to decrease quantity by 1
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input name="barcode" placeholder="Scan barcode here..." autoFocus />
          <Button className="bg-blue-600 hover:bg-blue-700">Scan</Button>
        </CardContent>
      </Card>
    </>
  );
}
