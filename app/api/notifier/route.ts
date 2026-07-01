import { db } from "@/lib/db";
import {
  ImageNotifierTable,
  ordersTable,
  shoeInventory,
  shoes,
  shoeModels,
} from "@/lib/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const notifiers = await db
      .select({
        id: ImageNotifierTable.id,
        shoeInventoryId: ImageNotifierTable.shoeInventoryId,
        direction: ImageNotifierTable.direction,
        createdAt: ImageNotifierTable.createdAt,
        size: shoeInventory.size,
        quantity: shoeInventory.quantity,
        shoeId: shoes.id,
        color: shoes.color,
        hexCode: shoes.hexCode,
        modelName: shoeModels.modelName,
        orderId: ImageNotifierTable.orderId,
        customerName: ordersTable.nom_client,
        orderReference: ordersTable.reference,
      })
      .from(ImageNotifierTable)
      .innerJoin(
        shoeInventory,
        eq(ImageNotifierTable.shoeInventoryId, shoeInventory.id)
      )
      .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
      .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
      .leftJoin(ordersTable, eq(ImageNotifierTable.orderId, ordersTable.id))
      .orderBy(desc(ImageNotifierTable.createdAt));

    return Response.json(notifiers);
  } catch (error) {
    console.error("Error fetching notifiers:", error);
    return Response.json(
      { error: "Failed to fetch notifiers" },
      { status: 500 }
    );
  }
}

// Bulk dismiss: { ids: string[] } — used by "Mark product done".
export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "ids array is required" }, { status: 400 });
    }

    const deleted = await db
      .delete(ImageNotifierTable)
      .where(inArray(ImageNotifierTable.id, ids))
      .returning({ id: ImageNotifierTable.id });

    revalidatePath("/notifier");
    return Response.json({ success: true, deleted: deleted.length });
  } catch (error) {
    console.error("Error bulk deleting notifiers:", error);
    return Response.json(
      { error: "Failed to delete notifier items" },
      { status: 500 }
    );
  }
}
