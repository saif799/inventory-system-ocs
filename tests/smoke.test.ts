import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { shoeInventory, shoeModels, shoes } from "@/lib/schema";
import { createTestDb } from "./testDb";

describe("test harness", () => {
  it("seeds a model, a color variant and a size row, and reads them back", async () => {
    const db = await createTestDb();

    const [model] = await db
      .insert(shoeModels)
      .values({ modelName: "Air Force 1" })
      .returning();

    const [shoe] = await db
      .insert(shoes)
      .values({ id: "shoe-1", modelId: model.id, color: "Triple White" })
      .returning();

    const [size] = await db
      .insert(shoeInventory)
      .values({ shoeId: shoe.id, size: "42", quantity: 5 })
      .returning();

    const [readBack] = await db
      .select()
      .from(shoeInventory)
      .where(eq(shoeInventory.id, size.id));

    expect(readBack.quantity).toBe(5);
    expect(readBack.size).toBe("42");
    expect(readBack.shoeId).toBe(shoe.id);
  });
});
