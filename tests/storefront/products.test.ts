import { beforeEach, describe, expect, it } from "vitest";
import { shoeInventory, shoeModels, shoes } from "@/lib/schema";
import { getStorefrontProducts } from "@/lib/storefront/products";
import { createTestDb, type TestDb } from "../testDb";
import type { Executor } from "@/lib/db";

let db: TestDb;

async function seedModel(modelName: string, basePrice: number) {
  const [model] = await db.insert(shoeModels).values({ modelName, basePrice }).returning();
  return model;
}

async function seedShoe(modelId: string, color: string, priceOverride?: number) {
  const [shoe] = await db
    .insert(shoes)
    .values({ id: `shoe-${crypto.randomUUID()}`, modelId, color, priceOverride })
    .returning();
  return shoe;
}

async function seedInventory(shoeId: string, size: string, quantity: number, priceOverride?: number) {
  const [inv] = await db
    .insert(shoeInventory)
    .values({ shoeId, size, quantity, priceOverride })
    .returning();
  return inv;
}

async function ids(filters: Parameters<typeof getStorefrontProducts>[0]) {
  const products = await getStorefrontProducts({ ...filters, exec: db as unknown as Executor });
  return products.map((p) => p.shoeId).sort();
}

beforeEach(async () => {
  db = await createTestDb();
});

describe("getStorefrontProducts: SQL-resolved filters", () => {
  it("returns everything in stock and priced when no filters are given", async () => {
    const modelA = await seedModel("Air Force 1", 5000);
    const shoeA1 = await seedShoe(modelA.id, "White");
    await seedInventory(shoeA1.id, "40", 2);
    await seedInventory(shoeA1.id, "41", 0); // out of stock size

    const shoeA2 = await seedShoe(modelA.id, "Black", 6000);
    await seedInventory(shoeA2.id, "42", 3);

    const unpriced = await seedModel("Unpriced Model", 0);
    const shoeC1 = await seedShoe(unpriced.id, "Grey");
    await seedInventory(shoeC1.id, "40", 2);

    expect(await ids({})).toEqual([shoeA1.id, shoeA2.id].sort());
  });

  it("filters by search text against model name or color, case-insensitively", async () => {
    const modelA = await seedModel("Air Force 1", 5000);
    const shoeA1 = await seedShoe(modelA.id, "White");
    await seedInventory(shoeA1.id, "40", 2);
    const shoeA2 = await seedShoe(modelA.id, "Black", 6000);
    await seedInventory(shoeA2.id, "42", 3);

    const modelB = await seedModel("Air Max", 8000);
    const shoeB1 = await seedShoe(modelB.id, "Red");
    await seedInventory(shoeB1.id, "40", 1, 7000);

    expect(await ids({ filters: { search: "air force" } })).toEqual([shoeA1.id, shoeA2.id].sort());
    expect(await ids({ filters: { search: "black" } })).toEqual([shoeA2.id]);
  });

  it("filters by modelId", async () => {
    const modelA = await seedModel("Air Force 1", 5000);
    const shoeA1 = await seedShoe(modelA.id, "White");
    await seedInventory(shoeA1.id, "40", 2);

    const modelB = await seedModel("Air Max", 8000);
    const shoeB1 = await seedShoe(modelB.id, "Red");
    await seedInventory(shoeB1.id, "40", 1);

    expect(await ids({ filters: { modelIds: [modelA.id] } })).toEqual([shoeA1.id]);
  });

  it("filters by size, matching only sizes that are actually in stock", async () => {
    const modelA = await seedModel("Air Force 1", 5000);
    const shoeA1 = await seedShoe(modelA.id, "White");
    await seedInventory(shoeA1.id, "40", 2);
    await seedInventory(shoeA1.id, "41", 0); // in the table, but zero quantity

    const modelB = await seedModel("Air Max", 8000);
    const shoeB1 = await seedShoe(modelB.id, "Red");
    await seedInventory(shoeB1.id, "40", 1, 7000);
    await seedInventory(shoeB1.id, "43", 5);

    expect(await ids({ filters: { sizes: ["40"] } })).toEqual([shoeA1.id, shoeB1.id].sort());
    expect(await ids({ filters: { sizes: ["41"] } })).toEqual([]);
  });

  it("filters by price range using the minimum resolved price across all in-stock sizes", async () => {
    const modelA = await seedModel("Air Force 1", 5000);
    const shoeA1 = await seedShoe(modelA.id, "White"); // minPrice 5000
    await seedInventory(shoeA1.id, "40", 2);
    const shoeA2 = await seedShoe(modelA.id, "Black", 6000); // minPrice 6000
    await seedInventory(shoeA2.id, "42", 3);

    const modelB = await seedModel("Air Max", 8000);
    const shoeB1 = await seedShoe(modelB.id, "Red"); // sizes 7000/8000 -> minPrice 7000
    await seedInventory(shoeB1.id, "40", 1, 7000);
    await seedInventory(shoeB1.id, "43", 5);

    expect(await ids({ filters: { minPrice: 6000 } })).toEqual([shoeA2.id, shoeB1.id].sort());
    expect(await ids({ filters: { maxPrice: 6000 } })).toEqual([shoeA1.id, shoeA2.id].sort());
    expect(await ids({ filters: { minPrice: 6000, maxPrice: 7000 } })).toEqual(
      [shoeA2.id, shoeB1.id].sort(),
    );
  });

  it("computes the price-range minimum over every in-stock size, not just sizes matched by another filter", async () => {
    // D1's overall minPrice is 3000 (from size 41), even though size 40 alone
    // resolves to 9000. A size filter must not narrow the rows used to
    // compute the price aggregate.
    const modelD = await seedModel("Jordan 1", 3000);
    const shoeD1 = await seedShoe(modelD.id, "Blue");
    await seedInventory(shoeD1.id, "40", 1, 9000);
    await seedInventory(shoeD1.id, "41", 1);

    expect(await ids({ filters: { sizes: ["40"], minPrice: 5000 } })).toEqual([]);
    expect(await ids({ filters: { sizes: ["40"], maxPrice: 3500 } })).toEqual([shoeD1.id]);
  });

  it("excludes unpriced products regardless of filters", async () => {
    const unpriced = await seedModel("Unpriced Model", 0);
    const shoeC1 = await seedShoe(unpriced.id, "Grey");
    await seedInventory(shoeC1.id, "40", 2);

    expect(await ids({ filters: { search: "unpriced" } })).toEqual([]);
    expect(await ids({ filters: { minPrice: 0 } })).toEqual([]);
  });

  it("combines search, model, size and price filters with AND semantics", async () => {
    const modelA = await seedModel("Air Force 1", 5000);
    const shoeA1 = await seedShoe(modelA.id, "White");
    await seedInventory(shoeA1.id, "40", 2);
    const shoeA2 = await seedShoe(modelA.id, "Black", 6000);
    await seedInventory(shoeA2.id, "42", 3);

    const result = await ids({
      filters: { search: "air force", modelIds: [modelA.id], sizes: ["42"], minPrice: 6000 },
    });
    expect(result).toEqual([shoeA2.id]);
  });
});
