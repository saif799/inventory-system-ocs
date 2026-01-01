"use server";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { ordersTable } from "./schema";

export async function markAsLivre(orderId: string) {
  try {
    await db
      .update(ordersTable)
      .set({ statusId: "830826fd-80f5-4a29-829b-6421264c7695" })
      .where(eq(ordersTable.id, orderId));
  } catch (error) {
    console.error("Error marking order as 'Ad Livré': ", error);
  }
}
export async function markAsRetour(orderId: string) {
  try {
    await db
      .update(ordersTable)
      .set({ statusId: "830826fd-80f5-4a29-829b-6421264c7695" })
      .where(eq(ordersTable.id, orderId));
  } catch (error) {
    console.error("Error marking order as 'Ad Livré': ", error);
  }
}
