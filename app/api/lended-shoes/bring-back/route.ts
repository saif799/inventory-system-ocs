import { db, txClient } from "@/lib/db";
import { LendedShoes } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { and, eq, sql } from "drizzle-orm";

type BringBackRequest = {
  borrowerId?: string;
  inventoryId?: string;
  quantity?: number;
};

export async function POST(request: Request) {
  try {
    const { borrowerId, inventoryId, quantity }: BringBackRequest =
      await request.json();

    const safeQuantity = Math.floor(Number(quantity));

    if (!borrowerId || !inventoryId || !Number.isFinite(safeQuantity)) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (safeQuantity < 1) {
      return Response.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    const [summary] = await db
      .select({
        lendedQuantity: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
      })
      .from(LendedShoes)
      .where(
        and(
          eq(LendedShoes.borrowerId, borrowerId),
          eq(LendedShoes.shoeInventoryId, inventoryId),
        ),
      );

    const lendedQuantity = Number(summary?.lendedQuantity ?? 0);
    if (safeQuantity > lendedQuantity) {
      return Response.json(
        {
          error: `Return quantity exceeds lended amount. Current lended quantity: ${lendedQuantity}`,
        },
        { status: 400 },
      );
    }

    await txClient().transaction(async (tx) => {
      await applyMovement(
        {
          reason: "return",
          items: [{ inventoryId, quantity: safeQuantity }],
          borrowerId,
        },
        tx,
      );
    });

    revalidateStockPaths(borrowerId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to bring back inventory:", error);
    return Response.json(
      { error: "Failed to bring back inventory" },
      { status: 500 },
    );
  }
}
