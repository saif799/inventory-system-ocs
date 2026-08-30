import { db, type Executor } from "@/lib/db";
import { shoeModels } from "@/lib/schema";
import { inArray } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `shoes.id` is a short varchar (it doubles as the printed barcode) while
 * `shoe_models.id` is a uuid, so a shoe id in the modelId slot is accepted by
 * TypeScript and only rejected by Postgres — as a 22P02 mid-transaction, which
 * surfaces to the user as an opaque "Failed to save arrival". Checking the shape
 * up front turns that into a 400 that names the offending value.
 */
export function findMalformedModelIds(modelIds: readonly string[]): string[] {
  return Array.from(new Set(modelIds.filter((id) => !UUID_RE.test(id))));
}

/**
 * Well-formed but unknown model ids would fail on the FK instead — same opaque
 * 500. Returns the ids that have no `shoe_models` row.
 */
export async function findUnknownModelIds(
  modelIds: readonly string[],
  exec: Executor = db,
): Promise<string[]> {
  const candidates = Array.from(new Set(modelIds));
  if (candidates.length === 0) return [];

  const found = await (exec as typeof db)
    .select({ id: shoeModels.id })
    .from(shoeModels)
    .where(inArray(shoeModels.id, candidates));

  const known = new Set(found.map((row) => row.id));
  return candidates.filter((id) => !known.has(id));
}
