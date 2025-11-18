import { db } from "@/lib/db";
import { shoeModels } from "@/lib/schema";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const models = await db.select().from(shoeModels);
    return Response.json(models);
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { modelName } = await request.json();

    if (!modelName) {
      return Response.json(
        { error: "Model name is required" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(shoeModels)
      .values({ modelName })
      .returning();

    revalidatePath("/");

    return Response.json(inserted);
  } catch (error) {
    return Response.json({ error: "Failed to create model" }, { status: 500 });
  }
}
