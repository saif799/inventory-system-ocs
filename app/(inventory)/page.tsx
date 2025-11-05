import Link from "next/link";
import { db } from "@/lib/db";
import { shoeInventory, shoes, shoeModels } from "@/lib/schema";
import { eq } from "drizzle-orm";
// import InventoryTable from "./table";
// import {
//   decreaseQuantityAction,
//   deleteItemAction,
//   scanBarcodeAction,
// } from "./actions";
import Listings from "@/components/Listings";
// import Search from "@/components/Search";

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

export default async function InventoryPage() {
  const models = await db.select().from(shoeModels);
  const products = await db
    .select({
      id: shoeInventory.id,
      modelId: shoes.modelId,
      color: shoes.color,
      quantity: shoeInventory.quantity,
      size: shoeInventory.size,
      modelName: shoeModels.modelName,
    })
    .from(shoes)
    .innerJoin(shoeInventory, eq(shoes.id, shoeInventory.shoeId))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id));
  const inventory = await fetchInventory();

  return (
    <div className="flex flex-col items-center justify-center gap-8 pb-8">
      {/* <div className="h-80"></div> */}

      {/* <Search /> */}
      {/* <InventoryTable
        q={q}
        filteredInventory={filteredInventory}
        scanBarcodeAction={scanBarcodeAction}
        decreaseQuantityAction={decreaseQuantityAction}
        deleteItemAction={deleteItemAction}
      /> */}
      <Listings models={models} products={products} />
    </div>
  );
}
