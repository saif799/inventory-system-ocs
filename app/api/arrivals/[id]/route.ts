import { db } from "@/lib/db";
import {
  arrivalItems,
  arrivals,
  shoeInventory,
  shoeModels,
  shoes,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const [arrival] = await db
      .select()
      .from(arrivals)
      .where(eq(arrivals.id, id))
      .limit(1);

    if (!arrival) {
      return Response.json({ error: "Arrival not found" }, { status: 404 });
    }

    const items = await db
      .select({
        id: arrivalItems.id,
        received: arrivalItems.quantity,
        inventoryId: shoeInventory.id,
        size: shoeInventory.size,
        currentStock: shoeInventory.quantity,
        shoeId: shoes.id,
        color: shoes.color,
        hexCode: shoes.hexCode,
        modelName: shoeModels.modelName,
      })
      .from(arrivalItems)
      .innerJoin(
        shoeInventory,
        eq(arrivalItems.shoeInventoryId, shoeInventory.id),
      )
      .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
      .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
      .where(eq(arrivalItems.arrivalId, id));

    return Response.json({ ...arrival, items });
  } catch (error) {
    console.error("Failed to fetch arrival:", error);
    return Response.json(
      { error: "Failed to fetch arrival" },
      { status: 500 },
    );
  }
}
