import { requireAdmin } from "@/lib/auth/guard";
import { db, txClient } from "@/lib/db";
import { LendedShoes } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { and, eq, inArray, sql } from "drizzle-orm";

type BringBackItem = { inventoryId?: string; quantity?: number };
type BringBackRequest = {
  borrowerId?: string;
  items?: BringBackItem[];
};

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { borrowerId, items }: BringBackRequest = await request.json();

    if (!borrowerId) {
      return Response.json({ error: "Missing borrowerId" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return Response.json({ error: "No items to bring back" }, { status: 400 });
    }

    const safeItems = items.map((item) => ({
      inventoryId: item.inventoryId,
      quantity: Math.floor(Number(item.quantity)),
    }));

    if (
      safeItems.some(
        (item) =>
          !item.inventoryId ||
          !Number.isFinite(item.quantity) ||
          item.quantity < 1,
      )
    ) {
      return Response.json(
        { error: "Every item needs a valid quantity of at least 1" },
        { status: 400 },
      );
    }

    const inventoryIds = [
      ...new Set(safeItems.map((item) => item.inventoryId!)),
    ];

    const summaries = await db
      .select({
        inventoryId: LendedShoes.shoeInventoryId,
        lendedQuantity: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
      })
      .from(LendedShoes)
      .where(
        and(
          eq(LendedShoes.borrowerId, borrowerId),
          inArray(LendedShoes.shoeInventoryId, inventoryIds),
        ),
      )
      .groupBy(LendedShoes.shoeInventoryId);
    const lendedById = new Map(
      summaries.map((s) => [s.inventoryId, Number(s.lendedQuantity)]),
    );

    for (const item of safeItems) {
      const lendedQuantity = lendedById.get(item.inventoryId!) ?? 0;
      if (item.quantity > lendedQuantity) {
        return Response.json(
          {
            error: `Return quantity exceeds lended amount. Current lended quantity: ${lendedQuantity}`,
          },
          { status: 400 },
        );
      }
    }

    await txClient().transaction(async (tx) => {
      await applyMovement(
        {
          reason: "return",
          items: safeItems as { inventoryId: string; quantity: number }[],
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
