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
      <Card className="mb-8 bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Barcode Scanner</CardTitle>
          <CardDescription className="text-slate-400">
            Scan a barcode to decrease quantity by 1
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={scanBarcodeAction} className="flex gap-2">
            <Input
              name="barcode"
              placeholder="Scan barcode here..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              autoFocus
            />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Scan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-8 bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-stretch">
            <form className="flex gap-2 flex-1" method="get">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by model, color, or barcode..."
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                />
              </div>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Apply
              </Button>
            </form>
            <select
              value={localSort}
              onChange={(e) => setLocalSort(e.target.value as SortKey)}
              className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-md"
            >
              <option value="model">Sort by Model</option>
              <option value="quantity">Sort by Quantity</option>
              <option value="size">Sort by Size</option>
            </select>

            <Dialog>
              <DialogTrigger className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-md">
                <PlusCircle />
              </DialogTrigger>
              <DialogContent
                className="mb-8 bg-slate-800 border-slate-700 p-0 max-w-xl w-full transition-all duration-300"
                style={{
                  maxHeight: "90vh",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div className="w-full p-6">
                  <AddShoeForm />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {sortedInventory.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-center">No items found</p>
            </CardContent>
          </Card>
        ) : (
          sortedInventory.map((item) => (
            <Card
              key={item.id}
              className={`bg-slate-800 border-slate-700 ${
                item.quantity < 5 ? "border-yellow-600" : ""
              }`}
            >
              <CardContent>
                <div className="grid gap-4 items-center grid-cols-3 md:grid-cols-6">
                  {/* Checkbox column */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-blue-500"
                      onChange={() => {
                        if (selectedItems.includes(item)) {
                          setSelectedItems(
                            selectedItems.filter((i) => i.id !== item.id)
                          );
                        } else {
                          setSelectedItems([...selectedItems, item]);
                        }
                      }}
                      checked={selectedItems.includes(item)}
                      // You may want to fully control this via state for bulk-select later
                    />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Model</p>
                    <p className="text-white font-semibold">{item.modelName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Color</p>
                    <p className="text-white">{item.color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Size</p>
                    <p className="text-white">{item.size}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Quantity</p>
                    <p
                      className={`text-lg font-bold ${
                        item.quantity < 5 ? "text-yellow-400" : "text-white"
                      }`}
                    >
                      {item.quantity}
                    </p>
                    {item.quantity < 5 && (
                      <p className="text-xs text-yellow-400">Low stock!</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap md:flex-nowrap justify-start md:justify-end mt-2 md:mt-0">
                    <form action={decreaseQuantityAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </form>
                    <form action={deleteItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 w-full md:w-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
