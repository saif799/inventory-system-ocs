import Listings from "@/components/Listings";
import { db } from "@/lib/db";
import {
  shoeInventory,
  shoes,
  shoeModels,
  LendedShoes,
  borrower,
} from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { connection } from "next/server";
import BorrowerActions from "@/components/borrowerActions";
import BorrowerHistory from "@/components/borrowerHistory";

export type GroupedProduct = {
  shoeId: string;
  modelId: string;
  modelName: string;
  color: string;
  hexCode: string;
  sizes: {
    inventoryId: string;
    size: string;
    quantity: number;
  }[];
};

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ lenderId: string }>;
}) {
  const { lenderId } = await params;
  await connection();

  const products = await db
    .select({
      id: shoeInventory.id,
      shoeId: shoes.id,
      modelId: shoes.modelId,
      color: shoes.color,
      hexCode: shoes.hexCode,
      quantity: sql<number>`SUM(${LendedShoes.quantity})`,
      size: shoeInventory.size,
      modelName: shoeModels.modelName,
    })
    .from(shoes)
    .innerJoin(shoeInventory, eq(shoes.id, shoeInventory.shoeId))
    .innerJoin(LendedShoes, eq(shoeInventory.id, LendedShoes.shoeInventoryId))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .where(eq(LendedShoes.borrowerId, lenderId))
    .groupBy(
      shoeInventory.id,
      shoes.id,
      shoes.modelId,
      shoes.color,
      shoes.hexCode,
      shoeInventory.size,
      shoeModels.modelName,
    )
    .having(sql`SUM(${LendedShoes.quantity}) > 0`);

  const models = await db.select().from(shoeModels);

  const [borrowerRow] = await db
    .select({ name: borrower.name })
    .from(borrower)
    .where(eq(borrower.id, lenderId))
    .limit(1);

  const history = await db
    .select({
      id: LendedShoes.id,
      quantity: LendedShoes.quantity,
      createdAt: LendedShoes.createdAt,
      size: shoeInventory.size,
      modelName: shoeModels.modelName,
      color: shoes.color,
    })
    .from(LendedShoes)
    .innerJoin(shoeInventory, eq(LendedShoes.shoeInventoryId, shoeInventory.id))
    .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .where(eq(LendedShoes.borrowerId, lenderId))
    .orderBy(desc(LendedShoes.createdAt));

  const groupedMap = new Map<string, GroupedProduct>();

  products.forEach((product) => {
    const key = product.shoeId;

    let group = groupedMap.get(key);
    if (!group) {
      group = {
        shoeId: product.shoeId,
        modelId: product.modelId,
        modelName: product.modelName,
        color: product.color,
        hexCode: product.hexCode,
        sizes: [],
      };
      groupedMap.set(key, group);
    }

    group.sizes.push({
      inventoryId: product.id,
      size: product.size,
      quantity: product.quantity,
    });
  });

  const groupedProducts = Array.from(groupedMap.values());

  return (
    <div className="flex flex-col items-center justify-center gap-8 pb-8">
      <div className="flex w-full max-w-3xl items-center justify-between px-1 pt-4">
        <h1 className="text-xl font-semibold">
          {borrowerRow?.name ?? "Borrower"}
        </h1>
        {borrowerRow && (
          <BorrowerActions
            borrowerId={lenderId}
            name={borrowerRow.name}
            redirectOnDelete
          />
        )}
      </div>
      <BorrowerHistory history={history} />
      <Listings models={models} products={groupedProducts} />
    </div>
  );
}
