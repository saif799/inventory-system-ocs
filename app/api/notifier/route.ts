import { db } from "@/lib/db";
import {
  ImageNotifierTable,
  shoeInventory,
  shoes,
  shoeModels,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const notifiers = await db
      .select({
        id: ImageNotifierTable.id,
        size: shoeInventory.size,
        color: shoes.color,
        modelName: shoeModels.modelName,
      })
      .from(ImageNotifierTable)
      .innerJoin(
        shoeInventory,
        eq(ImageNotifierTable.shoeInventoryId, shoeInventory.id)
      )
      .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
      .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id));

    return Response.json(notifiers);
  } catch (error) {
    console.error("Error fetching notifiers:", error);
    return Response.json(
      { error: "Failed to fetch notifiers" },
      { status: 500 }
    );
  }
}
