import Link from "next/link";
import { db } from "@/lib/db";
import { shoeInventory, shoes, shoeModels } from "@/lib/schema";
import { eq } from "drizzle-orm";
import InventoryTable from "./table";
import {
  decreaseQuantityAction,
  deleteItemAction,
  scanBarcodeAction,
} from "./actions";

type InventoryRow = {
  id: string;
  modelName: string;
  color: string;
  size: string;
  quantity: number;
};

async function fetchInventory(): Promise<InventoryRow[]> {
  const rows = await db
    .select({
      id: shoeInventory.id,
      modelName: shoeModels.modelName,
      color: shoes.color,
      size: shoeInventory.size,
      quantity: shoeInventory.quantity,
    })
    .from(shoeInventory)
    .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id));

  return rows;
}

function filterOnly(items: InventoryRow[], q: string) {
  const s = q.trim().toLowerCase();
  const filtered = items.filter((item) => {
    return (
      item.modelName.toLowerCase().includes(s) ||
      item.color.toLowerCase().includes(s) ||
      item.size.toLowerCase().includes(s)
    );
  });
  return filtered;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams?.q || "").trim();
  const inventory = await fetchInventory();
  const filteredInventory = filterOnly(inventory, q);
  const total = filteredInventory.length;

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <Link
          href="/"
          className="text-blue-400 hover:text-blue-300 mb-6 inline-block"
        >
          ← Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Inventory Management
          </h1>
          <p className="text-slate-400">Total items: {total}</p>
        </div>

        <InventoryTable
          q={q}
          filteredInventory={filteredInventory}
          scanBarcodeAction={scanBarcodeAction}
          decreaseQuantityAction={decreaseQuantityAction}
          deleteItemAction={deleteItemAction}
        />
      </div>
    </main>
  );
}
