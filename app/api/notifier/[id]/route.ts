import { db } from "@/lib/db";
import { ImageNotifierTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("deleting notifier", id);
    if (!id) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }
    const res = await db
      .delete(ImageNotifierTable)
      .where(eq(ImageNotifierTable.id, id))
      .returning({ id: ImageNotifierTable.id });
    if (res.length === 0) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }
    revalidatePath("/notifier");
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting notifier:", error);
    return Response.json(
      { error: "Failed to delete notifier item" },
      { status: 500 }
    );
  }
}
