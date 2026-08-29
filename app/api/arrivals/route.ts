import { requireAdmin } from "@/lib/auth/guard";
import { db, txClient } from "@/lib/db";
import {
  arrivalItems,
  arrivals,
  shoeInventory,
  shoeModels,
  shoes,
} from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { generateShortId } from "@/lib/generateId";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

type NewLine = {
  mode: "new";
  modelId: string;
  color: string;
  sizes: string[];
  quantity: number;
  /** Storefront base price in DZD (optional; defaults to 0 if omitted) */
  basePrice?: number;
  /** Optional compare-at/original price in DZD for strikethrough display */
  compareAtPrice?: number | null;
};

type ExistingLine = {
  mode: "existing";
  shoeId: string;
  sizes: string[];
  quantity: number;
};

type Line = NewLine | ExistingLine;

function normalizeSizes(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  return Array.from(
    new Set(
      sizes
        .map((s) => (typeof s === "string" ? s.trim() : String(s).trim()))
        .filter((s) => s.length > 0),
    ),
  );
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const rows = await db
      .select({
        id: arrivals.id,
        reference: arrivals.reference,
        note: arrivals.note,
        createdAt: arrivals.createdAt,
        variantCount: sql<number>`count(${arrivalItems.id})`.mapWith(Number),
        totalPairs:
          sql<number>`coalesce(sum(${arrivalItems.quantity}), 0)`.mapWith(
            Number,
          ),
      })
      .from(arrivals)
      .leftJoin(arrivalItems, eq(arrivalItems.arrivalId, arrivals.id))
      .groupBy(arrivals.id)
      .orderBy(desc(arrivals.createdAt));

    return Response.json(rows);
  } catch (error) {
    console.error("Failed to fetch arrivals:", error);
    return Response.json(
      { error: "Failed to fetch arrivals" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const reference: string | null = body?.reference?.trim() || null;
    const note: string | null = body?.note?.trim() || null;
    const lines: Line[] = Array.isArray(body?.lines) ? body.lines : [];

    if (lines.length === 0) {
      return Response.json({ error: "No lines to save" }, { status: 400 });
    }

    // Writes we'll commit atomically, plus the arrival_items snapshot rows.
    const shoeInserts: {
      id: string;
      modelId: string;
      color: string;
    }[] = [];
    const modelPriceUpdates = new Map<
      string,
      { basePrice?: number; compareAtPrice?: number | null }
    >();
    const inventoryInserts: {
      id: string;
      shoeId: string;
      size: string;
      quantity: number;
    }[] = [];
    const inventoryIncrements: { id: string; add: number }[] = [];
    const itemInserts: {
      shoeInventoryId: string;
      quantity: number;
    }[] = [];

    for (const line of lines) {
      const sizes = normalizeSizes(line.sizes);
      const quantity = Number(line.quantity);

      if (sizes.length === 0 || !Number.isFinite(quantity) || quantity < 1) {
        return Response.json(
          { error: "Each line needs at least one size and quantity >= 1" },
          { status: 400 },
        );
      }

      if (line.mode === "new") {
        if (!line.modelId || !line.color?.trim()) {
          return Response.json(
            { error: "New shoe lines need a model and color" },
            { status: 400 },
          );
        }
        const shoeId = generateShortId();
        shoeInserts.push({
          id: shoeId,
          modelId: line.modelId,
          color: line.color.trim(),
        });
        if (typeof line.basePrice === "number" || line.compareAtPrice !== undefined) {
          modelPriceUpdates.set(line.modelId, {
            ...(typeof line.basePrice === "number" ? { basePrice: line.basePrice } : {}),
            ...(line.compareAtPrice !== undefined ? { compareAtPrice: line.compareAtPrice ?? null } : {}),
          });
        }
        for (const size of sizes) {
          const invId = crypto.randomUUID();
          inventoryInserts.push({ id: invId, shoeId, size, quantity });
          itemInserts.push({ shoeInventoryId: invId, quantity });
        }
      } else {
        if (!line.shoeId) {
          return Response.json(
            { error: "Existing shoe lines need a shoeId" },
            { status: 400 },
          );
        }

        const existing = await db
          .select({
            id: shoeInventory.id,
            size: shoeInventory.size,
            quantity: shoeInventory.quantity,
          })
          .from(shoeInventory)
          .where(
            and(
              eq(shoeInventory.shoeId, line.shoeId),
              inArray(shoeInventory.size, sizes),
            ),
          );

        const bySize = new Map(existing.map((e) => [e.size, e]));

        for (const size of sizes) {
          const match = bySize.get(size);
          if (match) {
            inventoryIncrements.push({ id: match.id, add: quantity });
            itemInserts.push({ shoeInventoryId: match.id, quantity });
          } else {
            const invId = crypto.randomUUID();
            inventoryInserts.push({
              id: invId,
              shoeId: line.shoeId,
              size,
              quantity,
            });
            itemInserts.push({ shoeInventoryId: invId, quantity });
          }
        }
      }
    }

    const arrivalId = crypto.randomUUID();

    // Order matters: parents (arrival, shoes, inventory) before children
    // (arrival_items). All ids are pre-generated so children can reference
    // freshly-inserted rows inside the same transaction. Existing-variant
    // increments go through applyMovement so the restock notifier flag lands
    // in the same transaction as the stock change.
    await txClient().transaction(async (tx) => {
      await tx.insert(arrivals).values({ id: arrivalId, reference, note });

      if (shoeInserts.length) await tx.insert(shoes).values(shoeInserts);

      for (const [modelId, update] of modelPriceUpdates) {
        await tx.update(shoeModels).set(update).where(eq(shoeModels.id, modelId));
      }

      if (inventoryInserts.length)
        await tx.insert(shoeInventory).values(inventoryInserts);

      if (inventoryIncrements.length) {
        await applyMovement(
          {
            reason: "arrival",
            items: inventoryIncrements.map((inc) => ({
              inventoryId: inc.id,
              quantity: inc.add,
            })),
          },
          tx,
        );
      }

      await tx.insert(arrivalItems).values(itemInserts.map((it) => ({ ...it, arrivalId })));
    });

    revalidateStockPaths();
    return Response.json({ success: true, arrivalId });
  } catch (error) {
    console.error("Failed to save arrival:", error);
    return Response.json({ error: "Failed to save arrival" }, { status: 500 });
  }
}
