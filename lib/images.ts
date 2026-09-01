import { db } from "@/lib/db";
import { shoeImages } from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * Primary Image URL per colour variant, keyed by shoeId, for the admin
 * surfaces that render a thumbnail beside a grouped product.
 *
 * A second query rather than a leftJoin on the caller's products query, for
 * two reasons. Nothing in the schema forbids a variant carrying two isPrimary
 * rows, and those callers push one row per size, so a duplicate image would
 * double-count sizes. And the borrower page's query is grouped, so the url
 * would have to join the grouping key or be wrapped in MAX().
 *
 * isPrimary only, no sortOrder fallback: a variant with photos but no primary
 * renders the placeholder, which links to the editor where the primary is set.
 */
export async function primaryImageByShoeId(
  e: typeof db = db,
): Promise<Map<string, string>> {
  const rows = await e
    .select({ shoeId: shoeImages.shoeId, url: shoeImages.url })
    .from(shoeImages)
    .where(eq(shoeImages.isPrimary, true));

  return new Map(rows.map((i) => [i.shoeId, i.url]));
}
