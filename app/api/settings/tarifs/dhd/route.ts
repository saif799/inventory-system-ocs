import { requireAdmin } from "@/lib/auth/guard";
/**
 * PATCH /api/settings/tarifs/dhd
 *
 * Manual override for a single wilaya's DHD tarif row.
 * Body: { wilayaId, tarifLivraison, tarifStopdeskLivraison, tarifEchange, tarifStopdeskEchange }
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dhdTarifs } from "@/lib/schema";

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      wilayaId,
      tarifLivraison,
      tarifStopdeskLivraison,
      tarifEchange,
      tarifStopdeskEchange,
    } = body as {
      wilayaId: number;
      tarifLivraison?: string;
      tarifStopdeskLivraison?: string;
      tarifEchange?: string;
      tarifStopdeskEchange?: string;
    };

    if (!wilayaId) {
      return NextResponse.json({ error: "wilayaId is required" }, { status: 400 });
    }

    const updates: Partial<typeof dhdTarifs.$inferInsert> = {};
    if (tarifLivraison !== undefined) updates.tarifLivraison = tarifLivraison;
    if (tarifStopdeskLivraison !== undefined)
      updates.tarifStopdeskLivraison = tarifStopdeskLivraison;
    if (tarifEchange !== undefined) updates.tarifEchange = tarifEchange;
    if (tarifStopdeskEchange !== undefined)
      updates.tarifStopdeskEchange = tarifStopdeskEchange;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const rows = await db
      .update(dhdTarifs)
      .set(updates)
      .where(eq(dhdTarifs.wilayaId, wilayaId))
      .returning();

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `No tarif row found for wilayaId ${wilayaId}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, row: rows[0] });
  } catch (err) {
    console.error("[tarifs/dhd PATCH] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/settings/tarifs/dhd
 * Returns all DHD tarif rows joined with wilaya names, for the Settings table.
 */
import { dhdWilayas } from "@/lib/schema";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const rows = await db
      .select({
        wilayaId: dhdTarifs.wilayaId,
        wilayaName: dhdWilayas.name,
        tarifLivraison: dhdTarifs.tarifLivraison,
        tarifStopdeskLivraison: dhdTarifs.tarifStopdeskLivraison,
        tarifEchange: dhdTarifs.tarifEchange,
        tarifStopdeskEchange: dhdTarifs.tarifStopdeskEchange,
        syncedAt: dhdTarifs.syncedAt,
      })
      .from(dhdTarifs)
      .leftJoin(dhdWilayas, eq(dhdTarifs.wilayaId, dhdWilayas.wilayaId))
      .orderBy(dhdTarifs.wilayaId);

    return NextResponse.json({ tarifs: rows });
  } catch (err) {
    console.error("[tarifs/dhd GET] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
