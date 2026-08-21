import { db } from "@/lib/db";
import { shoes, shoeModels } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const shoesVariants = await db
      .select({
        id: shoes.id,
        modelName: shoeModels.modelName,
        color: shoes.color,
        modelId: shoeModels.id,
      })
      .from(shoes)
      .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id));

    return Response.json(shoesVariants);
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
