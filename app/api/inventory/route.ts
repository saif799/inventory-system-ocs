import { db } from "@/lib/db";
import { shoeInventory } from "@/lib/schema";
import { and, eq, inArray, InferSelectModel } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const inventory = await db.select().from(shoeInventory);
    // const inventory = db.inventory.getAll()
    return Response.json(inventory);
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { shoeId, sizes, quantity } = await request.json();

    if (!shoeId || !sizes || !quantity) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // First, check if a shoe with the same shoeId and size exists
    const existing = await db
      .select()
      .from(shoeInventory)
      .where(
        and(
          eq(shoeInventory.shoeId, shoeId),
          inArray(shoeInventory.size, sizes)
        )
      );

    const existingsizes = existing.map((e) => e.size);
    const newsizes = sizes.filter(
      (size: string) => !existingsizes.includes(size)
    );

    type ShoeInventoryItem = InferSelectModel<typeof shoeInventory>;
    let existingInserted: ShoeInventoryItem[] = [];
    let newInserted: ShoeInventoryItem[] = [];
    if (existingsizes.length > 0) {
      // If exists, update quantity
      existingInserted = await db
        .update(shoeInventory)
        .set({
          quantity: existing[0].quantity + Number(quantity),
        })
        .where(
          and(
            eq(shoeInventory.shoeId, shoeId),
            inArray(shoeInventory.size, existingsizes)
          )
        )
        .returning();
    }
    if (newsizes.length > 0) {
      // Otherwise, insert new entry
      newInserted = await db
        .insert(shoeInventory)
        .values(newsizes.map((size: string) => ({ shoeId, size, quantity })))
        .returning();
    }

    revalidatePath("/");
    revalidatePath("/add-shoes");
    return Response.json([existingInserted, newInserted]);
  } catch (error) {
    return Response.json(
      { error: "Failed to create inventory entry" },
      { status: 500 }
    );
  }
}
