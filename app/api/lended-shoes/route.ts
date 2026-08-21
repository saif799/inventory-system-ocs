import { db, txClient } from "@/lib/db";
import { LendedShoes, borrower, shoeInventory } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { storeHeldStock } from "@/lib/stock/availability";
import { eq, inArray, sql } from "drizzle-orm";

type LendRequest = {
  inventoryId?: string;
  borrowerName?: string;
  quantity?: number;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inventoryIdsParam = searchParams.get("inventoryIds");

    if (!inventoryIdsParam) {
      return Response.json({ error: "Missing inventoryIds" }, { status: 400 });
    }

    const inventoryIds = inventoryIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (inventoryIds.length === 0) {
      return Response.json({ error: "Invalid inventoryIds" }, { status: 400 });
    }

    const rows = await db
      .select({
        inventoryId: LendedShoes.shoeInventoryId,
        lentQuantity: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
      })
      .from(LendedShoes)
      .where(inArray(LendedShoes.shoeInventoryId, inventoryIds))
      .groupBy(LendedShoes.shoeInventoryId);

    return Response.json(rows);
  } catch (error) {
    console.error("Failed to fetch lended summary:", error);
    return Response.json(
      { error: "Failed to fetch lended summary" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { inventoryId, borrowerName, quantity }: LendRequest =
      await request.json();

    const cleanBorrowerName = borrowerName?.trim();
    const safeQuantity = Math.floor(Number(quantity));

    if (!inventoryId || !cleanBorrowerName || !Number.isFinite(safeQuantity)) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (safeQuantity < 1) {
      return Response.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    const [inventoryItem] = await db
      .select({
        id: shoeInventory.id,
        quantity: shoeInventory.quantity,
      })
      .from(shoeInventory)
      .where(eq(shoeInventory.id, inventoryId))
      .limit(1);

    if (!inventoryItem) {
      return Response.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const [lentSummary] = await db
      .select({
        lentQuantity: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
      })
      .from(LendedShoes)
      .where(eq(LendedShoes.shoeInventoryId, inventoryId));

    const alreadyLent = Number(lentSummary?.lentQuantity ?? 0);
    const remainingToLend = storeHeldStock(inventoryItem.quantity, alreadyLent);

    if (safeQuantity > remainingToLend) {
      return Response.json(
        {
          error: `Not enough inventory available to lend. Remaining lendable quantity: ${remainingToLend}`,
        },
        { status: 400 },
      );
    }

    const borrowerId = await txClient().transaction(async (tx) => {
      const [existingBorrower] = await tx
        .select()
        .from(borrower)
        .where(sql`LOWER(${borrower.name}) = LOWER(${cleanBorrowerName})`)
        .limit(1);

      let bId = existingBorrower?.id;
      if (!bId) {
        const [createdBorrower] = await tx
          .insert(borrower)
          .values({ name: cleanBorrowerName })
          .returning();
        bId = createdBorrower.id;
      }

      await applyMovement(
        {
          reason: "lend",
          items: [{ inventoryId, quantity: safeQuantity }],
          borrowerId: bId,
        },
        tx,
      );

      return bId;
    });

    revalidateStockPaths(borrowerId);
    return Response.json({
      success: true,
      borrowerId,
      inventory: inventoryItem,
    });
  } catch (error) {
    console.error("Failed to lend inventory:", error);
    return Response.json({ error: "Failed to lend inventory" }, { status: 500 });
  }
}
