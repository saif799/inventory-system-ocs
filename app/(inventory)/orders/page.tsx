import { db } from "@/lib/db";
import { columnsOrder } from "./columns";
import { OrdersTabs } from "./OrdersTabs";
import {
  ordersTable,
  shoeInventory,
  shoeModels,
  shoes,
  stautsGroupsTable,
  storeSales,
} from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export default async function DemoPage() {
  const dbStatus = await db.select().from(stautsGroupsTable);

  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt));

  const storeSaleRows = await db
    .select({
      id: storeSales.id,
      createdAt: storeSales.createdAt,
      inventoryId: storeSales.shoeInventoryId,
      size: shoeInventory.size,
      quantity: shoeInventory.quantity,
      shoeId: shoes.id,
      color: shoes.color,
      hexCode: shoes.hexCode,
      modelName: shoeModels.modelName,
    })
    .from(storeSales)
    .innerJoin(shoeInventory, eq(storeSales.shoeInventoryId, shoeInventory.id))
    .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .orderBy(desc(storeSales.createdAt));

  return (
    <div className="container mx-auto py-5">
      <OrdersTabs
        columns={columnsOrder}
        orders={orders}
        statuses={dbStatus}
        storeSales={storeSaleRows}
      />
    </div>
  );
}
