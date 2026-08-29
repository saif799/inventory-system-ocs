import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { shoeInventory } from "@/lib/schema";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

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
