import { db, txClient } from "@/lib/db";
import { LendedShoes, shoeInventory } from "@/lib/schema";
import { flagNotifier } from "@/lib/notifier";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

    // Compute sellable availability (across ALL borrowers) BEFORE this return.
    const [stock] = await db
      .select({ quantity: shoeInventory.quantity })
      .from(shoeInventory)
      .where(eq(shoeInventory.id, inventoryId))
      .limit(1);

    const [globalLent] = await db
      .select({
        lent: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
      })
      .from(LendedShoes)
      .where(eq(LendedShoes.shoeInventoryId, inventoryId));

    const availableBefore =
      Number(stock?.quantity ?? 0) - Number(globalLent?.lent ?? 0);

    const returnedRecord = await txClient().transaction(async (tx) => {
      const [record] = await tx
        .insert(LendedShoes)
        .values({
          borrowerId,
          shoeInventoryId: inventoryId,
          quantity: -safeQuantity,
        })
        .returning();

      // Bringing shoes back frees up sellable stock. Flag add-back only when the
      // variant was fully unavailable before and now has at least one free unit.
      if (availableBefore <= 0 && availableBefore + safeQuantity > 0) {
        await flagNotifier(inventoryId, "restock", undefined, tx);
      }

      return record;
    });

    revalidatePath("/");
    revalidatePath(`/${borrowerId}`);
    revalidatePath("/borrowers");

    return Response.json({ success: true, returnedRecord });
  } catch (error) {
    console.error("Failed to bring back inventory:", error);
    return Response.json(
      { error: "Failed to bring back inventory" },
      { status: 500 },
    );
  }
}
