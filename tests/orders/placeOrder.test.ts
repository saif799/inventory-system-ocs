import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  LendedShoes,
  borrower,
  orderItems,
  ordersTable,
  shoeInventory,
  shoeModels,
  shoes,
  stautsGroupsTable,
} from "@/lib/schema";
import { applyMovement, type MovementInput } from "@/lib/stock/movement";
import { placeOrder, type OrderDraft } from "@/lib/orders/placeOrder";
import {
  READY_TO_SHIP_STATUS_ID,
  READY_TO_SHIP_STATUS_NAME,
} from "@/lib/orders/status";
import { createTestDb, type TestDb } from "../testDb";
import type { Executor } from "@/lib/db";
import type { DeliveryProvider } from "@/lib/delivery";

let db: TestDb;

async function seedVariant(quantity: number) {
  const [model] = await db.insert(shoeModels).values({ modelName: "Air Force 1" }).returning();
  const [shoe] = await db
    .insert(shoes)
    .values({ id: `shoe-${crypto.randomUUID()}`, modelId: model.id, color: "White" })
    .returning();
  const [inv] = await db
    .insert(shoeInventory)
    .values({ shoeId: shoe.id, size: "42", quantity })
    .returning();
  return inv;
}

async function seedBorrower() {
  const [b] = await db.insert(borrower).values({ name: "Yacine" }).returning();
  return b;
}

async function move(input: MovementInput) {
  return applyMovement(input, db as unknown as Executor);
}

function fakeProvider(overrides: Partial<DeliveryProvider> = {}): DeliveryProvider {
  return {
    name: "dhd",
    createOrder: async () => ({ tracking: `FAKE-${crypto.randomUUID()}` }),
    deleteOrder: async () => ({ ok: true }),
    fetchStatuses: async () => [],
    ...overrides,
  };
}

function draftFor(
  inv: { id: string },
  overrides: Partial<OrderDraft> = {},
): OrderDraft {
  return {
    nom_client: "Yacine",
    telephone: "0555000000",
    telephone_2: null,
    adresse: "Alger centre",
    commune: "Alger Centre",
    code_wilaya: "16",
    montant: "3000",
    remarque: null,
    produit: "Air Force 1 White 42",
    type: 1,
    stop_desk: 0,
    source: "i",
    selectedSizeShoeId: [inv.id],
    provider: "dhd",
    borrowerId: null,
    ...overrides,
  };
}

beforeEach(async () => {
  db = await createTestDb();
  // ordersTable.statusId defaults to this id (see lib/schema.ts); the real DB
  // always has it seeded, so a fresh test DB needs the row too.
  await db
    .insert(stautsGroupsTable)
    .values({ id: READY_TO_SHIP_STATUS_ID, name: READY_TO_SHIP_STATUS_NAME });
});

describe("placeOrder: validation", () => {
  const REJECTIONS: [string, Partial<OrderDraft>, string][] = [
    ["nom_client", { nom_client: "" }, "Nom client (Customer name) is required."],
    ["selectedSizeShoeId", { selectedSizeShoeId: [] }, "Selected size ID is required."],
    ["telephone", { telephone: "" }, "Telephone is required."],
    ["adresse", { adresse: "" }, "Adresse (Address) is required."],
    ["commune", { commune: "" }, "Commune is required."],
    ["code_wilaya", { code_wilaya: "" }, "Code wilaya is required."],
    ["montant", { montant: "" }, "Montant (Amount) is required."],
    ["produit", { produit: "" }, "Produit (Product) is required."],
    ["type", { type: 0 }, "Type is required."],
    ["stop_desk", { stop_desk: -1 }, "Stop desk is required."],
  ];

  it.each(REJECTIONS)("rejects a missing %s with its existing message", async (_field, overrides, message) => {
    const inv = await seedVariant(2);
    const result = await placeOrder(draftFor(inv, overrides), {
      exec: db as unknown as Executor,
      provider: fakeProvider(),
    });
    expect(result).toEqual({ ok: false, status: 400, error: message });
  });
});

describe("placeOrder: borrower holdings", () => {
  it("rejects a borrower-placed order when the borrower doesn't hold enough of a variant", async () => {
    const inv = await seedVariant(5);
    const b = await seedBorrower();
    await move({ reason: "lend", items: [{ inventoryId: inv.id, quantity: 1 }], borrowerId: b.id });

    const result = await placeOrder(
      draftFor(inv, { borrowerId: b.id, selectedSizeShoeId: [inv.id, inv.id] }),
      { exec: db as unknown as Executor, provider: fakeProvider() },
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "This borrower does not hold one or more selected items.",
    });
    expect(await db.select().from(ordersTable)).toHaveLength(0);
  });
});

describe("placeOrder: courier failure", () => {
  it("leaves no order row, no order lines and no stock movement", async () => {
    const inv = await seedVariant(3);
    const provider = fakeProvider({
      createOrder: async () => {
        throw new Error("network down");
      },
    });

    const result = await placeOrder(draftFor(inv), {
      exec: db as unknown as Executor,
      provider,
    });

    expect(result).toEqual({
      ok: false,
      status: 502,
      error: "Failed to create order: network down",
    });
    expect(await db.select().from(ordersTable)).toHaveLength(0);
    expect(await db.select().from(orderItems)).toHaveLength(0);
    const [row] = await db.select().from(shoeInventory).where(eq(shoeInventory.id, inv.id));
    expect(row.quantity).toBe(3);
  });
});

describe("placeOrder: happy path", () => {
  it("writes one order line per variant with the right quantity and moves stock by the same number", async () => {
    const invA = await seedVariant(5);
    const invB = await seedVariant(2);
    const provider = fakeProvider({ createOrder: async () => ({ tracking: "TRACK-1" }) });

    const result = await placeOrder(
      draftFor(invA, { selectedSizeShoeId: [invA.id, invA.id, invB.id] }),
      { exec: db as unknown as Executor, provider },
    );

    expect(result).toEqual({ ok: true, orderId: "TRACK-1" });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, "TRACK-1"));
    expect(order.provider).toBe("dhd");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, "TRACK-1"));
    const byInventory = new Map(items.map((i) => [i.shoeInventoryId, i.quantity]));
    expect(byInventory.get(invA.id)).toBe(2);
    expect(byInventory.get(invB.id)).toBe(1);

    const [rowA] = await db.select().from(shoeInventory).where(eq(shoeInventory.id, invA.id));
    const [rowB] = await db.select().from(shoeInventory).where(eq(shoeInventory.id, invB.id));
    expect(rowA.quantity).toBe(3);
    expect(rowB.quantity).toBe(1);
  });

  it("a borrower-placed order drops Physical Quantity and that borrower's Holdings together", async () => {
    const inv = await seedVariant(5);
    const b = await seedBorrower();
    await move({ reason: "lend", items: [{ inventoryId: inv.id, quantity: 3 }], borrowerId: b.id });

    const provider = fakeProvider({ createOrder: async () => ({ tracking: "TRACK-B" }) });
    const result = await placeOrder(draftFor(inv, { borrowerId: b.id }), {
      exec: db as unknown as Executor,
      provider,
    });

    expect(result).toEqual({ ok: true, orderId: "TRACK-B" });

    const [row] = await db.select().from(shoeInventory).where(eq(shoeInventory.id, inv.id));
    expect(row.quantity).toBe(4);

    const heldRows = await db
      .select({ quantity: LendedShoes.quantity })
      .from(LendedShoes)
      .where(eq(LendedShoes.borrowerId, b.id));
    expect(heldRows.reduce((sum, r) => sum + r.quantity, 0)).toBe(2);
  });
});
