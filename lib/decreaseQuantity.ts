"use server";

import { eq, sql } from "drizzle-orm";
import { shoeInventory } from "./schema";
import { db } from "./db";
import { revalidatePath } from "next/cache";

export async function decreaseQuantity(id: string) {
  try {
    await db
      .update(shoeInventory)
      .set({ quantity: sql`GREATEST(0, ${shoeInventory.quantity} - 1)` })
      .where(eq(shoeInventory.id, id));

    revalidatePath("/");
  } catch (error) {
    console.error("Error decreasing quantity:", error);
  }
}
