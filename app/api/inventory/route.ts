import { db } from "@/lib/db";
import { shoeInventory } from "@/lib/schema";

export async function GET() {
  try {
    const inventory = await db.select().from(shoeInventory);
    return Response.json(inventory);
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
