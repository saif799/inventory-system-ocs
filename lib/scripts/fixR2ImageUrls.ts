/**
 * One-off migration: rewrite the cached public URLs — `shoe_images.url` and
 * `storefront_collections.image_url` — that were stored pointing at the R2 S3
 * API endpoint (`https://<accountId>.r2.cloudflarestorage.com/<bucket>/<key>`).
 *
 * That endpoint only answers authenticated, signed S3 requests, so browsers render
 * a broken image for every such row. The object key is unchanged — only the base
 * URL is swapped for the public one in R2_PUBLIC_URL.
 *
 * Run from repo root:
 *   npx tsx lib/scripts/fixR2ImageUrls.ts          # dry run, prints the plan
 *   npx tsx lib/scripts/fixR2ImageUrls.ts --apply  # writes the changes
 *
 * Safe to re-run, and re-run it again whenever R2_PUBLIC_URL changes (e.g. when
 * moving off the rate-limited pub-<hash>.r2.dev onto a custom domain).
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

import { shoeImages, storefrontCollections } from "../schema";
import { buildR2PublicUrl, getR2PublicBaseUrl } from "../r2";

dotenv.config();

const APPLY = process.argv.includes("--apply");

/**
 * Recovers the R2 object key from a legacy S3-endpoint URL, used only as a
 * fallback when `cloudflare_image_id` is empty. The legacy shape is
 * `https://<accountId>.r2.cloudflarestorage.com/<bucket>/<key>`, so the first
 * path segment (the bucket) is dropped.
 */
function keyFromLegacyUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.hostname.endsWith(".r2.cloudflarestorage.com")) return null;

  const segments = decodeURIComponent(parsed.pathname).split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return segments.slice(1).join("/");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — check your .env at the repo root.");
  }

  // Throws with a descriptive message if R2_PUBLIC_URL is missing, a placeholder,
  // or still pointing at the S3 API endpoint. Fail before touching any row.
  const base = getR2PublicBaseUrl();
  console.log(`Public base URL: ${base}`);
  console.log(APPLY ? "Mode: APPLY (rows will be written)\n" : "Mode: DRY RUN (use --apply to write)\n");

  const db = drizzle(neon(process.env.DATABASE_URL));
  const rows = await db.select().from(shoeImages);

  const planned: { id: string; key: string; from: string; to: string }[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const row of rows) {
    const key = row.cloudflareImageId?.trim() || keyFromLegacyUrl(row.url) || "";

    if (!key) {
      skipped.push({
        id: row.id,
        reason: `no object key on the row and none recoverable from url "${row.url}"`,
      });
      continue;
    }

    const correctUrl = buildR2PublicUrl(key);
    if (correctUrl === row.url) continue;

    planned.push({ id: row.id, key, from: row.url, to: correctUrl });
  }

  console.log(`${rows.length} image row(s) scanned.`);
  console.log(`${planned.length} need rewriting, ${rows.length - planned.length - skipped.length} already correct.\n`);

  for (const change of planned) {
    console.log(`  ${change.id}`);
    console.log(`    - ${change.from}`);
    console.log(`    + ${change.to}`);
  }

  if (skipped.length > 0) {
    console.log(`\n${skipped.length} row(s) skipped and left untouched — fix these by hand:`);
    for (const s of skipped) console.log(`  ${s.id}: ${s.reason}`);
  }

  if (!APPLY) {
    await fixCollections(db);
    console.log("\nDry run — nothing was written. Re-run with --apply to commit these changes.");
    return;
  }

  for (const change of planned) {
    // Backfills cloudflare_image_id too, so the key stays the source of truth
    // for the next base-URL swap.
    await db
      .update(shoeImages)
      .set({ url: change.to, cloudflareImageId: change.key })
      .where(eq(shoeImages.id, change.id));
  }

  console.log(`\n${planned.length} image row(s) updated.`);
  await fixCollections(db);
}

/**
 * `storefront_collections.image_url` is the second cached public URL in the
 * schema (ADR-0006), derived from `image_key` exactly as `shoe_images.url` is
 * derived from `cloudflare_image_id`. It has to be repaired by the same run, or
 * swapping R2_PUBLIC_URL fixes the product photos and leaves every homepage
 * Collection card pointing at the old host.
 */
async function fixCollections(db: ReturnType<typeof drizzle>) {
  const rows = await db.select().from(storefrontCollections);
  const planned = rows.flatMap((row) => {
    // An Incomplete Collection has no image at all — nothing to repair.
    if (!row.imageKey?.trim()) return [];
    const correctUrl = buildR2PublicUrl(row.imageKey.trim());
    return correctUrl === row.imageUrl ? [] : [{ id: row.id, title: row.title, to: correctUrl }];
  });

  console.log(`\n${rows.length} collection(s) scanned; ${planned.length} need rewriting.`);
  for (const change of planned) {
    console.log(`  ${change.title}`);
    console.log(`    + ${change.to}`);
  }

  if (!APPLY) return;

  for (const change of planned) {
    await db
      .update(storefrontCollections)
      .set({ imageUrl: change.to })
      .where(eq(storefrontCollections.id, change.id));
  }
  console.log(`${planned.length} collection row(s) updated.`);
}


main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nMigration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
