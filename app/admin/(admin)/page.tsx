import Listings from "@/components/Listings";
import AdminPage from "@/components/admin/AdminPage";
import { db } from "@/lib/db";
import { shoeInventory, shoes, shoeModels } from "@/lib/schema";
import { eq, gt } from "drizzle-orm";
import { connection } from "next/server";

export type GroupedProduct = {
  shoeId: string;
  modelId: string;
  modelName: string;
  color: string;
  /**
   * Archived variants stay on this page on purpose: archive is a
   * discoverability flag, and you still physically own these pairs.
   * Optional: surfaces that reuse this shape (e.g. a borrower's holdings) do
   * not carry the flag and render the card unbadged.
   */
  archived?: boolean;
  sizes: {
    inventoryId: string;
    size: string;
    quantity: number;
  }[];
};

export default async function InventoryPage() {
  await connection();

  const products = await db
    .select({
      id: shoeInventory.id,
      shoeId: shoes.id,
      modelId: shoes.modelId,
      color: shoes.color,
      archived: shoes.archived,
      modelArchived: shoeModels.archived,
      quantity: shoeInventory.quantity,
      size: shoeInventory.size,
      modelName: shoeModels.modelName,
    })
    .from(shoes)
    .innerJoin(shoeInventory, eq(shoes.id, shoeInventory.shoeId))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .where(gt(shoeInventory.quantity, 0));

  const models = await db.select().from(shoeModels);

  const groupedMap = new Map<string, GroupedProduct>();

  products.forEach((product) => {
    const key = product.shoeId;

    let group = groupedMap.get(key);
    if (!group) {
      group = {
        shoeId: product.shoeId,
        modelId: product.modelId,
        modelName: product.modelName,
        color: product.color,
        archived: product.archived || product.modelArchived,
        sizes: [],
      };
      groupedMap.set(key, group);
    }

    group.sizes.push({
      inventoryId: product.id,
      size: product.size,
      quantity: product.quantity,
    });
  });

  const groupedProducts = Array.from(groupedMap.values());

  return (
    <AdminPage
      title="Inventory"
      description="Every colour variant with pairs on the shelf."
      width="wide"
    >
      <div className="flex flex-col items-center justify-center gap-8">
        <Listings models={models} products={groupedProducts} />
      </div>
    </AdminPage>
  );
}
