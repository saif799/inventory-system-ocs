import { db } from "@/lib/db";
import { shoeInventory, shoes, shoeModels } from "@/lib/schema";
import { eq, gt } from "drizzle-orm";

import Listings from "@/components/Listings";

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
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .where(gt(shoeInventory.quantity, 0));

  return (
    <div className="flex flex-col items-center justify-center gap-8 pb-8">
      <Listings models={models} products={products} />
    </div>
  );
}
