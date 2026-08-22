/**
 * Server-side helpers that read delivery coverage data from the DB.
 * These replace the build-time JSON imports that were previously used in
 * yalidine.ts and sendShoeOrder.tsx.
 *
 * All functions use the default `db` (neon-http, no transaction needed).
 */

import { eq } from "drizzle-orm";
import { db, type Executor } from "@/lib/db";
import type { CommuneCoverage } from "./coverage";
import type { DeliveryProviderName } from "./types";
import {
  dhdWilayas,
  dhdCommunes,
  dhdTarifs,
  yalidineWilayas,
  yalidineCommunes,
} from "@/lib/schema";

// ── DHD ──────────────────────────────────────────────────────────────────────

export async function getDhdWilayas() {
  return db
    .select({ wilayaId: dhdWilayas.wilayaId, name: dhdWilayas.name })
    .from(dhdWilayas)
    .orderBy(dhdWilayas.wilayaId);
}

export async function getDhdCommunes(wilayaId: number, exec: Executor = db) {
  return (exec as typeof db)
    .select({
      nom: dhdCommunes.nom,
      hasStopDesk: dhdCommunes.hasStopDesk,
    })
    .from(dhdCommunes)
    .where(eq(dhdCommunes.wilayaId, wilayaId))
    .orderBy(dhdCommunes.nom);
}

export async function getDhdTarif(wilayaId: number, exec: Executor = db) {
  const rows = await (exec as typeof db)
    .select()
    .from(dhdTarifs)
    .where(eq(dhdTarifs.wilayaId, wilayaId))
    .limit(1);
  return rows[0] ?? null;
}

// ── Yalidine ─────────────────────────────────────────────────────────────────

export async function getYalidineWilayas() {
  return db
    .select({ wilayaId: yalidineWilayas.wilayaId, name: yalidineWilayas.name })
    .from(yalidineWilayas)
    .orderBy(yalidineWilayas.wilayaId);
}

export async function getYalidineCommunes(wilayaId: number, exec: Executor = db) {
  return (exec as typeof db)
    .select({
      communeId: yalidineCommunes.communeId,
      name: yalidineCommunes.name,
      wilayaName: yalidineCommunes.wilayaName,
      hasStopDesk: yalidineCommunes.hasStopDesk,
      isDeliverable: yalidineCommunes.isDeliverable,
      expressDesk: yalidineCommunes.expressDesk,
      stopdeskId: yalidineCommunes.stopdeskId,
    })
    .from(yalidineCommunes)
    .where(eq(yalidineCommunes.wilayaId, wilayaId))
    .orderBy(yalidineCommunes.name);
}

/** Returns the first express_desk price found for a wilaya (uniform per wilaya). */
export async function getYalidineExpressDesk(
  wilayaId: number,
): Promise<number | null> {
  const rows = await db
    .select({ expressDesk: yalidineCommunes.expressDesk })
    .from(yalidineCommunes)
    .where(eq(yalidineCommunes.wilayaId, wilayaId))
    .limit(1);
  return rows[0]?.expressDesk ?? null;
}

// ── Provider-neutral coverage ────────────────────────────────────────────────

/**
 * Flattens a wilaya's communes into the provider-neutral {@link CommuneCoverage}
 * shape. This is the single place courier-specific coverage semantics are
 * interpreted — nothing downstream should branch on `provider` again.
 */
export async function getCoverage(
  provider: DeliveryProviderName,
  wilayaId: number,
  exec: Executor = db,
): Promise<CommuneCoverage[]> {
  return provider === "yalidine"
    ? getYalidineCoverage(wilayaId, exec)
    : getDhdCoverage(wilayaId, exec);
}

async function getDhdCoverage(
  wilayaId: number,
  exec: Executor,
): Promise<CommuneCoverage[]> {
  const [communes, tarif] = await Promise.all([
    getDhdCommunes(wilayaId, exec),
    getDhdTarif(wilayaId, exec),
  ]);

  // Tarifs are stored as varchar because they mirror the courier payload
  // verbatim (same rationale as ordersTable.montant). Coerced to integer DZD
  // here and nowhere else.
  const homeFee = toDzd(tarif?.tarifLivraison);
  const deskFee = toDzd(tarif?.tarifStopdeskLivraison);

  return communes.map((c) => ({
    name: c.nom,
    modes: {
      // DHD delivers to the door in every commune it lists.
      home: { available: homeFee > 0, fee: homeFee },
      // A desk tarif of 0 means "no desk service in this wilaya", not "free":
      // it holds for exactly the wilayas whose communes all have has_stop_desk=0.
      desk: { available: c.hasStopDesk === 1 && deskFee > 0, fee: deskFee },
    },
  }));
}

async function getYalidineCoverage(
  wilayaId: number,
  exec: Executor,
): Promise<CommuneCoverage[]> {
  const communes = await getYalidineCommunes(wilayaId, exec);

  // Yalidine has no tarif table — express_desk is uniform across a wilaya's
  // communes and stands in for both legs.
  const fee = communes.find((c) => c.expressDesk != null)?.expressDesk ?? 0;

  return communes.map((c) => ({
    name: c.name,
    modes: {
      home: { available: c.isDeliverable === 1, fee },
      // stopdesk_id is the operative signal: it is the center_id parcel
      // creation needs, and it agrees with has_stop_desk on every row.
      desk: {
        available: c.stopdeskId != null && c.isDeliverable === 1,
        fee,
        deskId: c.stopdeskId,
      },
    },
  }));
}

function toDzd(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
