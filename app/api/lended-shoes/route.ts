import { requireAdmin } from "@/lib/auth/guard";
import { db, txClient } from "@/lib/db";
import { LendedShoes, borrower, shoeInventory } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { storeHeldStock } from "@/lib/stock/availability";
import { eq, inArray, sql } from "drizzle-orm";

type LendItem = { inventoryId?: string; quantity?: number };
type LendRequest = {
  borrowerName?: string;
  items?: LendItem[];
};

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

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
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { borrowerName, items }: LendRequest = await request.json();

    const cleanBorrowerName = borrowerName?.trim();
    if (!cleanBorrowerName) {
      return Response.json({ error: "Borrower name is required" }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return Response.json({ error: "No items to lend" }, { status: 400 });
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

    const inventoryRows = await db
      .select({
        id: shoeInventory.id,
        quantity: shoeInventory.quantity,
      })
      .from(shoeInventory)
      .where(inArray(shoeInventory.id, inventoryIds));

    if (inventoryRows.length !== inventoryIds.length) {
      return Response.json(
        { error: "One or more inventory items were not found" },
        { status: 404 },
      );
    }
    const quantityById = new Map(inventoryRows.map((r) => [r.id, r.quantity]));

    const lentRows = await db
      .select({
        inventoryId: LendedShoes.shoeInventoryId,
        lentQuantity: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
      })
      .from(LendedShoes)
      .where(inArray(LendedShoes.shoeInventoryId, inventoryIds))
      .groupBy(LendedShoes.shoeInventoryId);
    const lentById = new Map(
      lentRows.map((r) => [r.inventoryId, Number(r.lentQuantity)]),
    );

    for (const item of safeItems) {
      const remainingToLend = storeHeldStock(
        quantityById.get(item.inventoryId!)!,
        lentById.get(item.inventoryId!) ?? 0,
      );
      if (item.quantity > remainingToLend) {
        return Response.json(
          {
            error: `Not enough inventory available to lend. Remaining lendable quantity: ${remainingToLend}`,
          },
          { status: 400 },
        );
      }
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
          items: safeItems as { inventoryId: string; quantity: number }[],
          borrowerId: bId,
        },
        tx,
      );

      return bId;
    });

    revalidateStockPaths(borrowerId);
    return Response.json({ success: true, borrowerId });
  } catch (error) {
    console.error("Failed to lend inventory:", error);
    return Response.json({ error: "Failed to lend inventory" }, { status: 500 });
  }
}
