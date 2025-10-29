import { db } from "@/lib/db";
import { shoeInventory } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json();
    const id = params.id;

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
      return Response.json(updated);
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
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
