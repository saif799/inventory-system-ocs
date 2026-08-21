"use server";

import { db, txClient } from "@/lib/db";
import { shoeInventory } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function decreaseByOne(id: string) {
  const [current] = await db
    .select({ quantity: shoeInventory.quantity })
    .from(shoeInventory)
    .where(eq(shoeInventory.id, id))
    .limit(1);
  if (!current) return;

  const { updated } = await txClient().transaction((tx) =>
    applyMovement(
      {
        reason: "correction",
        items: [{ inventoryId: id, newQuantity: current.quantity - 1 }],
      },
      tx,
    ),
  );
  if (!updated[0]) return;
  revalidateStockPaths();
}

export async function decreaseQuantityAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await decreaseByOne(id);
}

export async function deleteItemAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await db.delete(shoeInventory).where(eq(shoeInventory.id, id));
  revalidatePath("/admin");
}

export async function scanBarcodeAction(formData: FormData) {
  const barcode = String(formData.get("barcode") || "").trim();
  if (!barcode) return;
  // NOTE: Adjust lookup once barcode field is defined in schema
  await decreaseByOne(barcode);
}
