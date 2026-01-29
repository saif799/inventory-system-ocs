import { db } from "@/lib/db";
import { ImageNotifierTable, shoeInventory, storeSales } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const { inventoryId } = await request.json();

    if (!inventoryId) {
      return Response.json({ error: "Invalid inventory id" }, { status: 400 });
    }

    // Start transaction: decrease quantity and create sale record
    const [updated] = await db
      .update(shoeInventory)
      .set({ quantity: sql`GREATEST(0, ${shoeInventory.quantity} - 1)` })
      .where(eq(shoeInventory.id, inventoryId))
      .returning();

    if (!updated) {
      return Response.json({ error: "Failed to update inventory" }, { status: 500 });
    }

    // Create store sale record


    // todo make it update the image notfier table and remove the orderId from it 
  
    await Promise.all([
      db.insert(ImageNotifierTable).values({shoeInventoryId: inventoryId, }),
      db.insert(storeSales).values({
        shoeInventoryId: inventoryId,
      })
    ])

    revalidatePath("/");
    return Response.json({ success: true, updated });
  } catch (error) {
    console.error("Failed to create store sale:", error);
    return Response.json(
      { error: "Failed to create store sale" },
      { status: 500 }
    );
  }
}
