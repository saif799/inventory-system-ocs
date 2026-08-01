/**
 * Seed script: reads the 4 legacy JSON files and inserts their data into the
 * 5 new delivery-coverage DB tables.
 *
 * Run from repo root:
 *   npx tsx lib/seed/seedDeliveryData.ts
 *
 *  note:you can delete this or update it later if needed
 *
 * Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING so existing rows are
 * not overwritten. After this initial seed, use the Settings page "Sync" buttons
 * to pull live data from the DHD / Yalidine APIs.
 */

import path from "path";
import fs from "fs";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

import {
  dhdWilayas,
  dhdCommunes,
  dhdTarifs,
  yalidineWilayas,
  yalidineCommunes,
} from "@/lib/schema";

// ── env ──────────────────────────────────────────────────────────────────────
for (const name of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), name);
  if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
}

const db = drizzle(neon(process.env.DATABASE_URL!));

// ── JSON shapes ───────────────────────────────────────────────────────────────
type WilayaRow = { wilaya_id: number; wilaya_name: string };
type DhdCommuneRow = { nom: string; has_stop_desk: number };
type DhdTarifRow = {
  wilaya_id: number;
  tarif: string;
  tarif_stopdesk: string;
};
type TarifsFile = {
  livraison: DhdTarifRow[];
  echnage: DhdTarifRow[]; // note: typo in original file kept intentionally
};
type YalidineCommune = {
  id: number;
  name: string;
  wilaya_name: string;
  has_stop_desk: number;
  express_desk: number | null;
  stopdesk_id: number | null;
};

// ── helpers ───────────────────────────────────────────────────────────────────
function loadJson<T>(filename: string): T {
  const p = path.resolve(process.cwd(), filename);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

async function seedDhd() {
  console.log("\n=== Seeding DHD ===");

  // 1. Wilayas (only from wilayas.json)
  const wilayas = loadJson<WilayaRow[]>("wilayas.json");
  const validWilayaIds = new Set(wilayas.map((w) => w.wilaya_id));

  const dhdWilayaRows = wilayas.map((w) => ({
    wilayaId: w.wilaya_id,
    name: w.wilaya_name,
  }));

  if (dhdWilayaRows.length) {
    await db.insert(dhdWilayas).values(dhdWilayaRows).onConflictDoNothing();
    console.log(`  dhd_wilayas: inserted up to ${dhdWilayaRows.length} rows`);
  }

  // 2. Communes (grouped by wilaya_id key, only for valid wilayas)
  const communesByWilaya =
    loadJson<Record<string, DhdCommuneRow[]>>("communes.json");
  const communeRows: { wilayaId: number; nom: string; hasStopDesk: number }[] =
    [];
  for (const [wilayaIdStr, communes] of Object.entries(communesByWilaya)) {
    const wilayaId = Number(wilayaIdStr);
    if (!validWilayaIds.has(wilayaId)) continue;
    for (const c of communes) {
      communeRows.push({
        wilayaId,
        nom: c.nom,
        hasStopDesk: c.has_stop_desk,
      });
    }
  }
  if (communeRows.length) {
    // Insert in chunks to avoid hitting parameter limits
    const CHUNK = 500;
    for (let i = 0; i < communeRows.length; i += CHUNK) {
      await db
        .insert(dhdCommunes)
        .values(communeRows.slice(i, i + CHUNK))
        .onConflictDoNothing();
    }
    console.log(`  dhd_communes: inserted up to ${communeRows.length} rows`);
  }

  // 3. Tarifs — merge livraison + echange by wilaya_id
  const tarifsFile = loadJson<TarifsFile>("tarifs.json");
  const livraison = tarifsFile.livraison ?? [];
  const echange = tarifsFile.echnage ?? [];

  // Build a map so we can merge both service types per wilaya
  const tarifMap = new Map<
    number,
    {
      tarifLivraison: string;
      tarifStopdeskLivraison: string;
      tarifEchange: string;
      tarifStopdeskEchange: string;
    }
  >();
  for (const row of livraison) {
    tarifMap.set(row.wilaya_id, {
      tarifLivraison: row.tarif,
      tarifStopdeskLivraison: row.tarif_stopdesk,
      tarifEchange: "0",
      tarifStopdeskEchange: "0",
    });
  }
  for (const row of echange) {
    const existing = tarifMap.get(row.wilaya_id);
    if (existing) {
      existing.tarifEchange = row.tarif;
      existing.tarifStopdeskEchange = row.tarif_stopdesk;
    } else {
      tarifMap.set(row.wilaya_id, {
        tarifLivraison: "0",
        tarifStopdeskLivraison: "0",
        tarifEchange: row.tarif,
        tarifStopdeskEchange: row.tarif_stopdesk,
      });
    }
  }

  const tarifRows = Array.from(tarifMap.entries()).map(([wilayaId, v]) => ({
    wilayaId,
    ...v,
  }));
  if (tarifRows.length) {
    await db.insert(dhdTarifs).values(tarifRows).onConflictDoNothing();
    console.log(`  dhd_tarifs: inserted up to ${tarifRows.length} rows`);
  }
}

async function seedYalidine() {
  console.log("\n=== Seeding Yalidine ===");

  // The JSON is grouped by wilaya_id key → array of commune objects
  const grouped = loadJson<Record<string, YalidineCommune[]>>(
    "yalidinCommunes_withExpressDesk.json",
  );

  // Derive unique wilayas from the communes file
  const wilayaMap = new Map<number, string>();
  const allCommunes: (typeof yalidineCommunes.$inferInsert)[] = [];

  for (const [wilayaIdStr, communes] of Object.entries(grouped)) {
    const wilayaId = Number(wilayaIdStr);
    for (const c of communes) {
      // First commune in each wilaya group tells us the wilaya_name
      if (!wilayaMap.has(wilayaId)) {
        wilayaMap.set(wilayaId, c.wilaya_name);
      }
      allCommunes.push({
        communeId: c.id,
        wilayaId,
        name: c.name,
        wilayaName: c.wilaya_name,
        hasStopDesk: c.has_stop_desk,
        isDeliverable: 1,
        expressDesk: c.express_desk ?? null,
        stopdeskId: c.stopdesk_id ?? null,
      });
    }
  }

  // 1. Wilayas
  const wilayaRows = Array.from(wilayaMap.entries()).map(([id, name]) => ({
    wilayaId: id,
    name,
  }));
  if (wilayaRows.length) {
    await db.insert(yalidineWilayas).values(wilayaRows).onConflictDoNothing();
    console.log(`  yalidine_wilayas: inserted up to ${wilayaRows.length} rows`);
  }

  // 2. Communes (in chunks)
  if (allCommunes.length) {
    const CHUNK = 500;
    for (let i = 0; i < allCommunes.length; i += CHUNK) {
      await db
        .insert(yalidineCommunes)
        .values(allCommunes.slice(i, i + CHUNK))
        .onConflictDoNothing();
    }
    console.log(
      `  yalidine_communes: inserted up to ${allCommunes.length} rows`,
    );
  }
}

async function main() {
  console.log("Starting delivery data seed…");
  await seedDhd();
  await seedYalidine();
  console.log("\n✅ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
