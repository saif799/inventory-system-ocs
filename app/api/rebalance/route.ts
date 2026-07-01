import { db } from "@/lib/db";
import {
  LendedShoes,
  borrower,
  shoeInventory,
  shoes,
  shoeModels,
} from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Live owner<->borrower rebalancing view — computed on demand from
 * shoe_inventory + lended_shoes (no stored table, never stale).
 *   ownerStore(variant) = shoeInventory.quantity - SUM(lended_shoes.quantity)
 */
export async function GET() {
  try {
    // BRING BACK: your sellable store for the variant is <= 0 while a specific
    // borrower still holds some -> go get it from them. Grouped by borrower+variant.
    const bringBack = await db
      .select({
        borrowerId: LendedShoes.borrowerId,
        borrowerName: borrower.name,
        shoeInventoryId: shoeInventory.id,
        size: shoeInventory.size,
        quantity: shoeInventory.quantity,
        shoeId: shoes.id,
        color: shoes.color,
        hexCode: shoes.hexCode,
        modelName: shoeModels.modelName,
        held: sql<number>`SUM(${LendedShoes.quantity})`,
      })
      .from(LendedShoes)
      .innerJoin(shoeInventory, eq(LendedShoes.shoeInventoryId, shoeInventory.id))
      .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
      .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
      .innerJoin(borrower, eq(LendedShoes.borrowerId, borrower.id))
      .groupBy(
        LendedShoes.borrowerId,
        borrower.name,
        shoeInventory.id,
        shoeInventory.size,
        shoeInventory.quantity,
        shoes.id,
        shoes.color,
        shoes.hexCode,
        shoeModels.modelName,
      )
      .having(
        and(
          sql`SUM(${LendedShoes.quantity}) > 0`,
          sql`${shoeInventory.quantity} - (
            SELECT COALESCE(SUM(ls2.quantity), 0)
            FROM lended_shoes ls2
            WHERE ls2.shoe_inventory_id = ${shoeInventory.id}
          ) <= 0`,
        ),
      );

    // GIVE SOME: any variant you have >1 of that isn't currently lent to anyone.
    const give = await db
      .select({
        shoeInventoryId: shoeInventory.id,
        size: shoeInventory.size,
        quantity: shoeInventory.quantity,
        shoeId: shoes.id,
        color: shoes.color,
        hexCode: shoes.hexCode,
        modelName: shoeModels.modelName,
      })
      .from(shoeInventory)
      .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
      .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
      .where(
        and(
          sql`${shoeInventory.quantity} > 1`,
          sql`COALESCE((
            SELECT SUM(ls.quantity)
            FROM lended_shoes ls
            WHERE ls.shoe_inventory_id = ${shoeInventory.id}
          ), 0) = 0`,
        ),
      )
      .orderBy(shoeModels.modelName, shoes.color, shoeInventory.size);

    return Response.json({ bringBack, give });
  } catch (error) {
    console.error("Error computing rebalance view:", error);
    return Response.json(
      { error: "Failed to compute rebalance view" },
      { status: 500 },
    );
  }
}
