import { db } from "@/lib/db";
import { shoeInventory } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { action, quantity } = await request.json();
    const { id } = await params;

    if (!id) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    if (action === "decrease") {
      const [updated] = await db
        .update(shoeInventory)
        .set({ quantity: sql`GREATEST(0, ${shoeInventory.quantity} - 1)` })
        .where(eq(shoeInventory.id, id))
        .returning();
      if (!updated) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      revalidatePath("/");
      return Response.json(updated);
    }

    if (action === "update" && typeof quantity === "number") {
      const [updated] = await db
        .update(shoeInventory)
        .set({ quantity: Math.max(0, quantity) })
        .where(eq(shoeInventory.id, id))
        .returning();
      if (!updated) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      revalidatePath("/");
      return Response.json(updated);
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.log("Failed to update inventory", error);
    return Response.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }
    const res = await db
      .delete(shoeInventory)
      .where(eq(shoeInventory.id, id))
      .returning({ id: shoeInventory.id });
    if (res.length === 0) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
