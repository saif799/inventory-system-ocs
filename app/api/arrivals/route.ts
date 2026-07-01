import { db } from "@/lib/db";
import {
  arrivalItems,
  arrivals,
  shoeInventory,
  shoes,
} from "@/lib/schema";
import { flagNotifier } from "@/lib/notifier";
import { generateShortId } from "@/lib/generateId";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type NewLine = {
  mode: "new";
  modelId: string;
  color: string;
  hexCode?: string;
  sizes: string[];
  quantity: number;
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
  try {
    const body = await request.json();
    const reference: string | null = body?.reference?.trim() || null;
    const note: string | null = body?.note?.trim() || null;
    const lines: Line[] = Array.isArray(body?.lines) ? body.lines : [];

    if (lines.length === 0) {
      return Response.json({ error: "No lines to save" }, { status: 400 });
    }

    // Writes we'll commit atomically, plus the arrival_items snapshot rows and
    // the restock flags we run afterwards.
    const shoeInserts: {
      id: string;
      modelId: string;
      color: string;
      hexCode: string;
    }[] = [];
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
    const restockFlags: string[] = [];

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
          hexCode: line.hexCode?.trim() || "#FFFFFF",
        });
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
            // A size that was sold out and is now back -> gallery re-sync.
            if (match.quantity === 0) restockFlags.push(match.id);
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
    // freshly-inserted rows inside the same batch/transaction.
    const writes: unknown[] = [
      db.insert(arrivals).values({ id: arrivalId, reference, note }),
    ];
    if (shoeInserts.length) writes.push(db.insert(shoes).values(shoeInserts));
    if (inventoryInserts.length)
      writes.push(db.insert(shoeInventory).values(inventoryInserts));
    for (const inc of inventoryIncrements) {
      writes.push(
        db
          .update(shoeInventory)
          .set({ quantity: sql`${shoeInventory.quantity} + ${inc.add}` })
          .where(eq(shoeInventory.id, inc.id)),
      );
    }
    writes.push(
      db
        .insert(arrivalItems)
        .values(itemInserts.map((it) => ({ ...it, arrivalId }))),
    );

    // neon-http runs db.batch([...]) as a single server-side transaction.
    await db.batch(
      writes as unknown as Parameters<typeof db.batch>[0],
    );

    if (restockFlags.length) {
      await Promise.all(
        [...new Set(restockFlags)].map((id) => flagNotifier(id, "restock")),
      );
    }

    revalidatePath("/");
    revalidatePath("/arrivals");
    revalidatePath("/add-shoes");
    return Response.json({ success: true, arrivalId });
  } catch (error) {
    console.error("Failed to save arrival:", error);
    return Response.json({ error: "Failed to save arrival" }, { status: 500 });
  }
}
