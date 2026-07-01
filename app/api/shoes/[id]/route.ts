import { db } from "@/lib/db";
import { shoes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function isValidHexColor(value: string) {
  return /^#([0-9A-Fa-f]{6})$/.test(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { hexCode } = await request.json();

    if (!id) {
      return Response.json({ error: "Invalid shoe id" }, { status: 400 });
    }

    if (typeof hexCode !== "string" || !isValidHexColor(hexCode)) {
      return Response.json({ error: "Invalid hex color value" }, { status: 400 });
    }

    const [updated] = await db
      .update(shoes)
      .set({ hexCode: hexCode.toUpperCase() })
      .where(eq(shoes.id, id))
      .returning();

    if (!updated) {
      return Response.json({ error: "Shoe not found" }, { status: 404 });
    }

    revalidatePath("/");
    revalidatePath(`/${id}`);
    return Response.json(updated);
  } catch (error) {
    console.error("Failed to update shoe hex color", error);
    return Response.json(
      { error: "Failed to update shoe hex color" },
      { status: 500 },
    );
  }
}
