import { requireAdmin } from "@/lib/auth/guard";
import { db, txClient } from "@/lib/db";
import { storeSales } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { inventoryId } = await request.json();

    if (!inventoryId) {
      return Response.json({ error: "Invalid inventory id" }, { status: 400 });
    }

    const updated = await txClient().transaction(async (tx) => {
      const { updated } = await applyMovement(
        { reason: "sale", items: [{ inventoryId, quantity: 1 }] },
        tx,
      );

      await tx.insert(storeSales).values({ shoeInventoryId: inventoryId });

      return updated[0];
    });

    if (!updated) {
      throw new Error("Failed to update inventory");
    }

    revalidateStockPaths();
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
  const denied = await requireAdmin();
  if (denied) return denied;

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

    await txClient().transaction(async (tx) => {
      await applyMovement(
        { reason: "cancel", items: [{ inventoryId: sale.inventoryId, quantity: 1 }] },
        tx,
      );
      await tx.delete(storeSales).where(eq(storeSales.id, id));
    });

    revalidateStockPaths();
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to revert store sale:", error);
    return Response.json(
      { error: "Failed to revert store sale" },
      { status: 500 }
    );
  }
}
