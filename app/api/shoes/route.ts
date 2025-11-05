import { db } from "@/lib/db";
import { shoes, shoeInventory, shoeModels } from "@/lib/schema";
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
export async function POST(request: Request) {
  try {
    const { modelId, color, sizes, quantity, id } = await request.json();

    if (!modelId || !color || !sizes || !quantity) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [insertedShoe] = await db
      .insert(shoes)
      .values({ modelId, color, id })
      .returning();

    await db.insert(shoeInventory).values(
      sizes.map((size: string) => ({
        shoeId: id,
        size,
        quantity,
      }))
    );

    return Response.json(insertedShoe);
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to create shoe" }, { status: 500 });
  }
}
