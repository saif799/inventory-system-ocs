import { db, type Executor } from "@/lib/db";
import { ImageNotifierTable } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export type NotifierDirection = "remove" | "restock";

/**
 * Flags a size-variant for a gallery update, keeping AT MOST one pending action
 * per variant:
 *  - if an OPPOSITE-direction row already exists for this variant, the two
 *    actions cancel out (e.g. sold-out then restocked) -> delete it, insert nothing.
 *  - if a SAME-direction row already exists -> no-op (already pending).
 *  - otherwise insert a fresh entry.
 *
 * Call sites are responsible for deciding WHETHER availability actually flipped
 * (stock reached 0, or was 0 and is now back) before calling this.
 *
 * Pass `exec` (a transaction handle) to run inside a caller's transaction so the
 * notifier write and the stock mutation succeed or fail together; defaults to the
 * shared `db` for standalone use.
 */
export async function flagNotifier(
  inventoryId: string,
  direction: NotifierDirection,
  orderId?: string,
  exec: Executor = db,
) {
  // The two drivers expose the same query builder at runtime but slightly
  // different static types; narrow to one so the builder chains type-check.
  const e = exec as typeof db;

  const opposite: NotifierDirection =
    direction === "remove" ? "restock" : "remove";

  // Opposing pending action -> they net out, clear it and stop.
  const canceled = await e
    .delete(ImageNotifierTable)
    .where(
      and(
        eq(ImageNotifierTable.shoeInventoryId, inventoryId),
        eq(ImageNotifierTable.direction, opposite),
      ),
    )
    .returning({ id: ImageNotifierTable.id });

  if (canceled.length > 0) {
    return;
  }

  // Same-direction action already pending -> nothing to add.
  const [existing] = await e
    .select({ id: ImageNotifierTable.id })
    .from(ImageNotifierTable)
    .where(
      and(
        eq(ImageNotifierTable.shoeInventoryId, inventoryId),
        eq(ImageNotifierTable.direction, direction),
      ),
    )
    .limit(1);

  if (existing) {
    return;
  }

  await e.insert(ImageNotifierTable).values({
    shoeInventoryId: inventoryId,
    direction,
    orderId: orderId ?? null,
  });
}
