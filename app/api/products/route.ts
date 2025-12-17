import { db } from "@/lib/db";
import { shoeInventory, shoes, shoeModels } from "@/lib/schema";
import { eq, gt } from "drizzle-orm";

export type AllShoesResponseType = {
  id: string;
  modelId: string;
  color: string;
  quantity: number;
  size: string;
  modelName: string;
}[];
export async function GET() {
  try {
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

    return Response.json(products);
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch all the shoes" },
      { status: 500 }
    );
  }
}
