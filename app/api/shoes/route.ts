import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { shoes, shoeModels } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const shoesVariants = await db
      .select({
        id: shoes.id,
        modelName: shoeModels.modelName,
        color: shoes.color,
        modelId: shoeModels.id,
      })
      .from(shoes)
      .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
      // Archived variants stay in stock and in history, but must not be
      // offered as a target for a new arrivage.
      .where(and(eq(shoes.archived, false), eq(shoeModels.archived, false)));

    return Response.json(shoesVariants);
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
