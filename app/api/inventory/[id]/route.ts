import { txClient } from "@/lib/db";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";

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

    if (action === "update" && typeof quantity === "number") {
      const { updated } = await txClient().transaction((tx) =>
        applyMovement(
          { reason: "correction", items: [{ inventoryId: id, newQuantity: quantity }] },
          tx,
        ),
      );
      if (!updated[0]) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      revalidateStockPaths();
      return Response.json(updated[0]);
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
