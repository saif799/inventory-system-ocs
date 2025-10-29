"use server";

import { db } from "@/lib/db";
import { shoeInventory } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function decreaseQuantityAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const [updated] = await db
    .update(shoeInventory)
    .set({ quantity: sql`GREATEST(0, ${shoeInventory.quantity} - 1)` })
    .where(eq(shoeInventory.id, id))
    .returning();
  if (!updated) return;
  revalidatePath("/inventory");
}

export async function deleteItemAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await db.delete(shoeInventory).where(eq(shoeInventory.id, id));
  revalidatePath("/inventory");
}

export async function scanBarcodeAction(formData: FormData) {
  const barcode = String(formData.get("barcode") || "").trim();
  if (!barcode) return;
  // NOTE: Adjust lookup once barcode field is defined in schema
  const id = barcode;
  const [updated] = await db
    .update(shoeInventory)
    .set({ quantity: sql`GREATEST(0, ${shoeInventory.quantity} - 1)` })
    .where(eq(shoeInventory.id, id))
    .returning();
  if (!updated) return;
  revalidatePath("/inventory");
}
