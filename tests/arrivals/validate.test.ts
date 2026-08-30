import { beforeEach, describe, expect, it } from "vitest";
import { shoeModels, shoes } from "@/lib/schema";
import {
  findMalformedModelIds,
  findUnknownModelIds,
} from "@/lib/arrivals/validate";
import { createTestDb, type TestDb } from "../testDb";
import type { Executor } from "@/lib/db";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

async function seedModel(modelName: string) {
  const [model] = await db.insert(shoeModels).values({ modelName }).returning();
  return model;
}

describe("arrivage model id validation", () => {
  // The bug: the add-shoes form's "Existing Shoe" picker wrote the selected
  // shoes.id into the same state slot the "new shoe" path sent as modelId, so
  // an arrivage went out carrying a barcode where a model uuid belonged.
  it("rejects a shoes.id in the modelId slot", () => {
    expect(findMalformedModelIds(["71f4c8482f5"])).toEqual(["71f4c8482f5"]);
  });

  it("accepts real model uuids and reports only the bad ones, deduped", async () => {
    const model = await seedModel("Jurassic Raptor");

    expect(
      findMalformedModelIds([
        model.id,
        "84c5cb2357e",
        "71f4c8482f5",
        "71f4c8482f5",
      ]),
    ).toEqual(["84c5cb2357e", "71f4c8482f5"]);
  });

  it("passes a batch of genuine model ids", async () => {
    const a = await seedModel("Air Force 1");
    const b = await seedModel("Jurassic Raptor");

    expect(findMalformedModelIds([a.id, b.id])).toEqual([]);
    expect(await findUnknownModelIds([a.id, b.id], db as unknown as Executor)).toEqual(
      [],
    );
  });

  it("rejects a well-formed uuid with no shoe_models row", async () => {
    const model = await seedModel("Air Force 1");
    const ghost = "229780d7-fe62-45f0-b104-295bab148621";

    expect(
      await findUnknownModelIds([model.id, ghost], db as unknown as Executor),
    ).toEqual([ghost]);
  });

  // Guard-rail for the guard: this is the raw failure the validation exists to
  // pre-empt. If Postgres ever stops rejecting this, the checks above are moot.
  it("documents the raw Postgres failure the guard replaces", async () => {
    const model = await seedModel("Jurassic Raptor");
    await db
      .insert(shoes)
      .values({ id: "71f4c8482f5", modelId: model.id, color: "Green" });

    const err = await db
      .insert(shoes)
      .values([
        { id: "4397738df10", modelId: model.id, color: "Lime" },
        { id: "af5884de4bb", modelId: "71f4c8482f5", color: "ice/full Black/chrome" },
      ])
      .then(() => null)
      .catch((e) => e as Error & { cause?: { code?: string; message?: string } });

    expect(err).not.toBeNull();
    expect(err!.cause?.code).toBe("22P02");
    expect(err!.cause?.message).toMatch(
      /invalid input syntax for type uuid: "71f4c8482f5"/,
    );
  });
});
