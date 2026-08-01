/**
 * Server-side helpers that read delivery coverage data from the DB.
 * These replace the build-time JSON imports that were previously used in
 * yalidine.ts and sendShoeOrder.tsx.
 *
 * All functions use the default `db` (neon-http, no transaction needed).
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
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

export async function getDhdCommunes(wilayaId: number) {
  return db
    .select({
      nom: dhdCommunes.nom,
      hasStopDesk: dhdCommunes.hasStopDesk,
    })
    .from(dhdCommunes)
    .where(eq(dhdCommunes.wilayaId, wilayaId))
    .orderBy(dhdCommunes.nom);
}

export async function getDhdTarif(wilayaId: number) {
  const rows = await db
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

export async function getYalidineCommunes(wilayaId: number) {
  return db
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
