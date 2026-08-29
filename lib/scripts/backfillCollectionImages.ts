/**
 * One-off migration for ADR-0006: give every existing Collection a slug and an
 * image.
 *
 * Run from repo root:
 *   npx tsx lib/scripts/backfillCollectionImages.ts          # dry run, prints the plan
 *   npx tsx lib/scripts/backfillCollectionImages.ts --apply  # writes the changes
 *
 * ORDER MATTERS — run this BEFORE `pnpm push`. `slug` is NOT NULL UNIQUE, and
 * Postgres cannot add a not-null column to a table that already has rows, so
 * drizzle-kit push's only offer at that prompt is to truncate — which would
 * delete the live Collections. This script therefore adds the four new columns
 * itself (nullable, `IF NOT EXISTS`), fills them, and only then promotes `slug`
 * to NOT NULL UNIQUE. `pnpm push` is then left with the two table renames, the
 * `section_id` -> `collection_id` rename and the `cta_href` drop, and prompts
 * for nothing destructive.
 *
 * It resolves whichever table name is live, so it is also safe to run after the
 * rename, and safe to re-run: it only ever fills nulls.
 */

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

import { buildR2PublicUrl, getR2PublicBaseUrl } from "../r2";
import { collectionSlug, uniqueCollectionSlug } from "../storefront/slug";

dotenv.config();

const APPLY = process.argv.includes("--apply");

/** Post-rename name first — the two names never coexist. */
const COLLECTION_TABLES = ["storefront_collections", "storefront_sections"] as const;
const ITEM_TABLES = ["storefront_collection_items", "storefront_section_items"] as const;

/** Matches what `.unique()` on lib/schema.ts's `slug` column generates. */
const SLUG_CONSTRAINT = "storefront_collections_slug_unique";

/** `neon(url)` returns the non-arrayMode, non-fullResults flavour specifically. */
type Sql = ReturnType<typeof neon<false, false>>;

async function tableExists(sql: Sql, name: string): Promise<boolean> {
  const rows = (await sql.query("SELECT to_regclass($1) AS oid", [`public.${name}`])) as {
    oid: string | null;
  }[];
  return rows[0]?.oid != null;
}

async function columnExists(sql: Sql, table: string, column: string): Promise<boolean> {
  const rows = (await sql.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )) as unknown[];
  return rows.length > 0;
}

async function resolveTable(sql: Sql, candidates: readonly string[]): Promise<string> {
  for (const name of candidates) {
    if (await tableExists(sql, name)) return name;
  }
  throw new Error(`None of these tables exist: ${candidates.join(", ")}`);
}

type CollectionRow = {
  id: string;
  title: string;
  slug: string | null;
  image_key: string | null;
};

type Plan = {
  id: string;
  title: string;
  /** Null when the row already had one. */
  slug: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  /** Why the image was left alone, when it was. */
  imageNote: string;
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — check your .env at the repo root.");
  }

  // Fails loudly before touching a row if R2_PUBLIC_URL is missing or still
  // points at the S3 API endpoint — the same guard as fixR2ImageUrls.ts.
  console.log(`Public base URL: ${getR2PublicBaseUrl()}`);
  console.log(
    APPLY ? "Mode: APPLY (rows will be written)\n" : "Mode: DRY RUN (use --apply to write)\n",
  );

  const sql = neon(process.env.DATABASE_URL);
  const collectionTable = await resolveTable(sql, COLLECTION_TABLES);
  const itemTable = await resolveTable(sql, ITEM_TABLES);
  // The FK column is renamed by the same push that renames the tables.
  const itemFk = (await columnExists(sql, itemTable, "collection_id"))
    ? "collection_id"
    : "section_id";
  console.log(`Tables: ${collectionTable} / ${itemTable}.${itemFk}\n`);

  if (APPLY) {
    // Nullable and IF NOT EXISTS — this is the step that lets `pnpm push` skip
    // its destructive not-null prompt later.
    for (const column of ["slug", "image_key", "image_url", "image_alt"]) {
      await sql.query(`ALTER TABLE ${collectionTable} ADD COLUMN IF NOT EXISTS ${column} varchar`);
    }
  }

  const hasNewColumns = await columnExists(sql, collectionTable, "slug");
  if (!hasNewColumns) {
    console.log("(the new columns do not exist yet — --apply would add them first)\n");
  }

  const collections = (await sql.query(
    `SELECT id, title,
            ${hasNewColumns ? "slug, image_key" : "NULL::varchar AS slug, NULL::varchar AS image_key"}
       FROM ${collectionTable}
      ORDER BY sort_order, created_at`,
  )) as CollectionRow[];

  const taken = new Set(collections.map((c) => c.slug).filter((s): s is string => !!s));
  const plans: Plan[] = [];

  for (const collection of collections) {
    let slug: string | null = null;
    if (!collection.slug) {
      slug = uniqueCollectionSlug(collectionSlug(collection.title), taken);
      taken.add(slug);
    }

    let imageKey: string | null = null;
    let imageUrl: string | null = null;
    let imageNote = "already set";

    if (!collection.image_key) {
      // The primary image of the first pick, and nothing else: no placeholder,
      // and no falling through to the second pick. A Collection with nothing to
      // borrow lands in the Incomplete state, which already exists and is
      // already handled everywhere.
      // The first pick is resolved in its own subquery on purpose. Joining
      // shoe_images with `is_primary = true` in one pass would drop a pick that
      // has no primary image *before* the LIMIT, silently borrowing the second
      // pick's photo instead of leaving the row Incomplete.
      const rows = (await sql.query(
        `SELECT img.cloudflare_image_id AS key
           FROM shoe_images img
          WHERE img.is_primary = true
            AND img.shoe_id = (
              SELECT item.shoe_id
                FROM ${itemTable} item
               WHERE item.${itemFk} = $1
               ORDER BY item.sort_order, item.created_at
               LIMIT 1
            )
          ORDER BY img.sort_order, img.created_at
          LIMIT 1`,
        [collection.id],
      )) as { key: string | null }[];

      const key = rows[0]?.key?.trim();
      if (key) {
        imageKey = key;
        imageUrl = buildR2PublicUrl(key);
        imageNote = "from the first pick's primary image";
      } else {
        imageNote = "left null — no pick, or the first pick has no primary image (Incomplete)";
      }
    }

    plans.push({ id: collection.id, title: collection.title, slug, imageKey, imageUrl, imageNote });
  }

  console.log(`${collections.length} collection(s) scanned.\n`);
  for (const plan of plans) {
    console.log(`  ${plan.title} (${plan.id})`);
    console.log(`    slug:  ${plan.slug ?? "(unchanged)"}`);
    console.log(`    image: ${plan.imageUrl ?? plan.imageNote}`);
  }

  if (!APPLY) {
    console.log("\nDry run — nothing was written. Re-run with --apply to commit these changes.");
    return;
  }

  for (const plan of plans) {
    if (plan.slug) {
      await sql.query(`UPDATE ${collectionTable} SET slug = $1 WHERE id = $2`, [
        plan.slug,
        plan.id,
      ]);
    }
    if (plan.imageKey) {
      await sql.query(`UPDATE ${collectionTable} SET image_key = $1, image_url = $2 WHERE id = $3`, [
        plan.imageKey,
        plan.imageUrl,
        plan.id,
      ]);
    }
  }

  // Only now can the column carry its real constraints. Both match what
  // lib/schema.ts declares, so `pnpm push` sees them as already applied.
  await sql.query(`ALTER TABLE ${collectionTable} ALTER COLUMN slug SET NOT NULL`);
  // Named for the POST-rename table even when run before the rename: Postgres
  // carries constraint names through `ALTER TABLE ... RENAME` unchanged, so
  // naming it after the current table would leave `pnpm push` looking at a
  // `storefront_sections_slug_unique` it does not recognise and wanting to
  // drop and recreate it.
  await sql.query(`
    DO $$ BEGIN
      ALTER TABLE ${collectionTable}
        ADD CONSTRAINT ${SLUG_CONSTRAINT} UNIQUE (slug);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END $$;
  `);

  console.log(`\n${plans.length} collection(s) updated; slug is now NOT NULL UNIQUE.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nBackfill failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
