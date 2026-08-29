import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { shoeModels } from "@/lib/schema";
import { eq, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // Feeds the add-shoes model picker, so archived models are withheld.
    const models = await db
      .select()
      .from(shoeModels)
      .where(eq(shoeModels.archived, false));
    return Response.json(models);
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { modelName } = await request.json();
    const name = typeof modelName === "string" ? modelName.trim() : "";

    if (!name) {
      return Response.json(
        { error: "Model name is required" },
        { status: 400 }
      );
    }

    // Caught here as well as on rename: a guard that only fires when correcting
    // a typo is a guard that arrives too late to prevent the duplicate.
    const [clash] = await db
      .select({ modelName: shoeModels.modelName })
      .from(shoeModels)
      .where(ilike(shoeModels.modelName, name))
      .limit(1);

    if (clash) {
      return Response.json(
        { error: `A model named "${clash.modelName}" already exists` },
        { status: 409 }
      );
    }

    const [inserted] = await db
      .insert(shoeModels)
      .values({ modelName: name })
      .returning();

    revalidatePath("/admin");
    revalidatePath("/admin/add-shoes");

    return Response.json(inserted);
  } catch (error) {
    return Response.json({ error: "Failed to create model" }, { status: 500 });
  }
}
