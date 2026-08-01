/**
 * POST /api/settings/sync/dhd
 *
 * Syncs coverage data from DHD's API into the DB:
 *   1. GET /api/v1/get/wilayas  → upsert dhd_wilayas
 *   2. GET /api/v1/get/communes → upsert dhd_communes, remove stale rows
 *   3. GET /api/v1/get/fees     → upsert dhd_tarifs
 *
 * Returns a summary of changes.
 */

import { NextResponse } from "next/server";
import { inArray, notInArray, sql } from "drizzle-orm";
import { txClient } from "@/lib/db";
import { dhdCommunes, dhdTarifs, dhdWilayas } from "@/lib/schema";

const BASE_URL = "https://platform.dhd-dz.com/api/v1";

function authHeader() {
  return `Bearer ${process.env.NEXT_PUBLIC_DHD_API_KEY}`;
}

type DhdWilayaRow = { wilaya_id: number; wilaya_name: string };
type DhdCommuneApiRow = {
  nom: string;
  wilaya_id: number;
  code_postal?: string;
  has_stop_desk: number;
};
type DhdFeeRow = {
  wilaya_id: number;
  tarif: string;
  tarif_stopdesk: string;
};
type DhdFeesResponse = {
  livraison?: DhdFeeRow[];
  echnage?: DhdFeeRow[];
  pickup?: DhdFeeRow[];
};

export async function POST() {
  try {
    const headers = {
      "Content-Type": "application/json",
      authorization: authHeader(),
    };
    const now = new Date();

    // ── 1. Wilayas ─────────────────────────────────────────────────────────
    const wilayasRes = await fetch(`${BASE_URL}/get/wilayas`, { headers });
    if (!wilayasRes.ok) {
      return NextResponse.json(
        { error: `DHD wilayas fetch failed: ${wilayasRes.status}` },
        { status: 502 },
      );
    }
    const wilayasData: DhdWilayaRow[] = await wilayasRes.json();

    // ── 2. Communes ─────────────────────────────────────────────────────────
    const communesRes = await fetch(`${BASE_URL}/get/communes`, { headers });
    if (!communesRes.ok) {
      return NextResponse.json(
        { error: `DHD communes fetch failed: ${communesRes.status}` },
        { status: 502 },
      );
    }
    // DHD returns an object keyed by index string: { "0": {...}, "1": {...} }
    const communesRaw: Record<string, DhdCommuneApiRow> =
      await communesRes.json();
    const communesData: DhdCommuneApiRow[] = Array.isArray(communesRaw)
      ? communesRaw
      : Object.values(communesRaw);

    // ── 3. Fees ─────────────────────────────────────────────────────────────
    const feesRes = await fetch(`${BASE_URL}/get/fees`, { headers });
    if (!feesRes.ok) {
      return NextResponse.json(
        { error: `DHD fees fetch failed: ${feesRes.status}` },
        { status: 502 },
      );
    }
    const feesData: DhdFeesResponse = await feesRes.json();

    // ── Write to DB (in a transaction) ──────────────────────────────────────
    const db = txClient();

    const result = await db.transaction(async (tx) => {
      // 1. Upsert wilayas
      const wilayaRows = wilayasData.map((w) => ({
        wilayaId: w.wilaya_id,
        name: w.wilaya_name,
        syncedAt: now,
      }));
      await tx
        .insert(dhdWilayas)
        .values(wilayaRows)
        .onConflictDoUpdate({
          target: dhdWilayas.wilayaId,
          set: { name: sql`excluded.name`, syncedAt: sql`excluded.synced_at` },
        });

      const activeWilayaIds = wilayasData.map((w) => w.wilaya_id);
      const activeWilayaSet = new Set(activeWilayaIds);

      // Remove wilayas, communes, and tarifs no longer in DHD's response
      let wilayasRemoved = 0;
      let communesRemoved = 0;
      let tarifsRemoved = 0;

      if (activeWilayaIds.length > 0) {
        const removedTarifs = await tx
          .delete(dhdTarifs)
          .where(notInArray(dhdTarifs.wilayaId, activeWilayaIds))
          .returning({ wilayaId: dhdTarifs.wilayaId });
        tarifsRemoved = removedTarifs.length;

        const removedCommunes = await tx
          .delete(dhdCommunes)
          .where(notInArray(dhdCommunes.wilayaId, activeWilayaIds))
          .returning({ id: dhdCommunes.id });
        communesRemoved = removedCommunes.length;

        const deletedWilayas = await tx
          .delete(dhdWilayas)
          .where(notInArray(dhdWilayas.wilayaId, activeWilayaIds))
          .returning({ wilayaId: dhdWilayas.wilayaId });
        wilayasRemoved = deletedWilayas.length;
      }

      // 2. Upsert communes (only for active wilayas returned by API)
      const communeRows = communesData
        .filter((c) => activeWilayaSet.has(c.wilaya_id))
        .map((c) => ({
          wilayaId: c.wilaya_id,
          nom: c.nom,
          hasStopDesk: c.has_stop_desk,
          syncedAt: now,
        }));

      let communesAdded = 0;
      const CHUNK = 500;
      for (let i = 0; i < communeRows.length; i += CHUNK) {
        const inserted = await tx
          .insert(dhdCommunes)
          .values(communeRows.slice(i, i + CHUNK))
          .onConflictDoUpdate({
            target: [dhdCommunes.wilayaId, dhdCommunes.nom],
            set: {
              hasStopDesk: sql`excluded.has_stop_desk`,
              syncedAt: sql`excluded.synced_at`,
            },
          })
          .returning({ id: dhdCommunes.id });
        communesAdded += inserted.length;
      }

      // 3. Upsert tarifs — merge livraison + echange (only for active wilayas)
      const livraison = feesData.livraison ?? [];
      const echange = feesData.echnage ?? [];

      const tarifMap = new Map<
        number,
        {
          tarifLivraison: string;
          tarifStopdeskLivraison: string;
          tarifEchange: string;
          tarifStopdeskEchange: string;
        }
      >();
      for (const r of livraison) {
        tarifMap.set(r.wilaya_id, {
          tarifLivraison: r.tarif,
          tarifStopdeskLivraison: r.tarif_stopdesk,
          tarifEchange: "0",
          tarifStopdeskEchange: "0",
        });
      }
      for (const r of echange) {
        const existing = tarifMap.get(r.wilaya_id);
        if (existing) {
          existing.tarifEchange = r.tarif;
          existing.tarifStopdeskEchange = r.tarif_stopdesk;
        } else {
          tarifMap.set(r.wilaya_id, {
            tarifLivraison: "0",
            tarifStopdeskLivraison: "0",
            tarifEchange: r.tarif,
            tarifStopdeskEchange: r.tarif_stopdesk,
          });
        }
      }

      const tarifRows = Array.from(tarifMap.entries())
        .filter(([wilayaId]) => activeWilayaSet.has(wilayaId))
        .map(([wilayaId, v]) => ({
          wilayaId,
          ...v,
          syncedAt: now,
        }));

      if (tarifRows.length > 0) {
        await tx
          .insert(dhdTarifs)
          .values(tarifRows)
          .onConflictDoUpdate({
            target: dhdTarifs.wilayaId,
            set: {
              tarifLivraison: sql`excluded.tarif_livraison`,
              tarifStopdeskLivraison: sql`excluded.tarif_stopdesk_livraison`,
              tarifEchange: sql`excluded.tarif_echange`,
              tarifStopdeskEchange: sql`excluded.tarif_stopdesk_echange`,
              syncedAt: sql`excluded.synced_at`,
            },
          });
      }

      return {
        wilayas: {
          total: wilayasData.length,
          removed: wilayasRemoved,
        },
        communes: {
          total: communeRows.length,
          upserted: communesAdded,
          removed: communesRemoved,
        },
        tarifs: {
          total: tarifRows.length,
        },
        syncedAt: now.toISOString(),
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync/dhd] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
