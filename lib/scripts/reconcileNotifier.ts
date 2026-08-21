/**
 * Recovery script for the manual-edit notifier bug: before the Stock Movement
 * module existed, zeroing a size's Physical Quantity by hand (the inventory
 * edit dialog, or the admin listing's decrement button) never flagged the
 * Shoe Image Gallery for removal. This walks every colour variant currently
 * at zero and queues a "remove" for each one that has no pending notifier
 * action already covering it.
 *
 * flagNotifier is itself idempotent (a same-direction pending row is a
 * no-op), so running this script twice in a row with --apply queues nothing
 * the second time.
 *
 * Run from repo root:
 *   npx tsx lib/scripts/reconcileNotifier.ts          # dry run, prints the plan
 *   npx tsx lib/scripts/reconcileNotifier.ts --apply  # writes the changes
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import dotenv from "dotenv";

import { ImageNotifierTable, shoeInventory, shoeModels, shoes } from "../schema";
import { flagNotifier } from "../stock/notifier";

dotenv.config();

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — check your .env at the repo root.");
  }

  console.log(APPLY ? "Mode: APPLY (rows will be written)\n" : "Mode: DRY RUN (use --apply to write)\n");

  const db = drizzle(neon(process.env.DATABASE_URL));

  const soldOut = await db
    .select({
      id: shoeInventory.id,
      size: shoeInventory.size,
      color: shoes.color,
      modelName: shoeModels.modelName,
    })
    .from(shoeInventory)
    .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .where(eq(shoeInventory.quantity, 0));

  const planned: typeof soldOut = [];

  for (const variant of soldOut) {
    const [pendingRemove] = await db
      .select({ id: ImageNotifierTable.id })
      .from(ImageNotifierTable)
      .where(
        and(
          eq(ImageNotifierTable.shoeInventoryId, variant.id),
          eq(ImageNotifierTable.direction, "remove"),
        ),
      )
      .limit(1);

    if (!pendingRemove) planned.push(variant);
  }

  console.log(`${soldOut.length} sold-out variant(s) scanned.`);
  console.log(`${planned.length} need a "remove" queued (already flagged: ${soldOut.length - planned.length}).\n`);

  for (const variant of planned) {
    console.log(`  ${variant.modelName} - ${variant.color} - ${variant.size} (${variant.id})`);
  }

  if (!APPLY) {
    console.log("\nDry run — nothing was written. Re-run with --apply to commit these changes.");
    return;
  }

  for (const variant of planned) {
    await flagNotifier(variant.id, "remove", undefined, db);
  }

  console.log(`\n${planned.length} row(s) queued.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nReconcile failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
