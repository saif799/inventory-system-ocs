import { db, txClient } from "@/lib/db";
import { shoeInventory, storeSales } from "@/lib/schema";
import { flagNotifier } from "@/lib/notifier";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const { inventoryId } = await request.json();

    if (!inventoryId) {
      return Response.json({ error: "Invalid inventory id" }, { status: 400 });
    }

    const updated = await txClient().transaction(async (tx) => {
      // Decrease quantity and create the sale record atomically.
      const [row] = await tx
        .update(shoeInventory)
        .set({ quantity: sql`GREATEST(0, ${shoeInventory.quantity} - 1)` })
        .where(eq(shoeInventory.id, inventoryId))
        .returning();

      if (!row) {
        throw new Error("Failed to update inventory");
      }

      await tx.insert(storeSales).values({ shoeInventoryId: inventoryId });

      // Only flag the gallery when this sale emptied the variant's stock.
      if (row.quantity === 0) {
        await flagNotifier(inventoryId, "remove", undefined, tx);
      }

      return row;
    });

    revalidatePath("/");
    return Response.json({ success: true, updated });
  } catch (error) {
    console.error("Failed to create store sale:", error);
    return Response.json(
      { error: "Failed to create store sale" },
      { status: 500 }
    );
  }
}

// Revert a store sale: the unit comes back to stock and the gallery re-syncs.
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return Response.json({ error: "Invalid sale id" }, { status: 400 });
    }

    const [sale] = await db
      .select({ inventoryId: storeSales.shoeInventoryId })
      .from(storeSales)
      .where(eq(storeSales.id, id))
      .limit(1);

    if (!sale) {
      return Response.json({ error: "Sale not found" }, { status: 404 });
    }

    // Read stock BEFORE adding the unit back so we know if it was out of stock.
    const [inventoryItem] = await db
      .select({ quantity: shoeInventory.quantity })
      .from(shoeInventory)
      .where(eq(shoeInventory.id, sale.inventoryId))
      .limit(1);

    const priorQuantity = inventoryItem?.quantity ?? 0;

    await txClient().transaction(async (tx) => {
      await tx
        .update(shoeInventory)
        .set({ quantity: sql`${shoeInventory.quantity} + 1` })
        .where(eq(shoeInventory.id, sale.inventoryId));
      await tx.delete(storeSales).where(eq(storeSales.id, id));

      // Only flag add-back when this revert brings the variant back from 0 stock.
      if (priorQuantity === 0) {
        await flagNotifier(sale.inventoryId, "restock", undefined, tx);
      }
    });

    revalidatePath("/");
    revalidatePath("/orders");
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to revert store sale:", error);
    return Response.json(
      { error: "Failed to revert store sale" },
      { status: 500 }
    );
  }
}
