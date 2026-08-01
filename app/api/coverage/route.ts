/**
 * GET /api/coverage
 * Returns communes + tarif for a given wilaya and provider.
 *
 * Query params:
 *   wilaya_id  (required) — integer 1-58
 *   provider   (required) — "dhd" | "yalidine"
 *
 * Response:
 *   {
 *     communes: [{ nom, hasStopDesk }]              // DHD
 *     communes: [{ communeId, name, stopdeskId, expressDesk }]  // Yalidine
 *     tarif: { livraison, stopdesk } | null         // DHD only
 *   }
 *
 * GET /api/coverage/wilayas?provider=dhd|yalidine
 * Returns the list of wilayas covered by the given provider.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDhdCommunes,
  getDhdTarif,
  getDhdWilayas,
  getYalidineCommunes,
  getYalidineWilayas,
} from "@/lib/delivery/coverageData";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const wilayaIdParam = searchParams.get("wilaya_id");
  const provider = searchParams.get("provider") as "dhd" | "yalidine" | null;
  const listWilayas = searchParams.get("list") === "wilayas";

  if (listWilayas) {
    // Return the full wilaya list for the given provider
    if (provider === "dhd") {
      const wilayas = await getDhdWilayas();
      return NextResponse.json({ wilayas });
    }
    if (provider === "yalidine") {
      const wilayas = await getYalidineWilayas();
      return NextResponse.json({ wilayas });
    }
    return NextResponse.json({ error: "provider must be dhd or yalidine" }, { status: 400 });
  }

  if (!wilayaIdParam || !provider) {
    return NextResponse.json(
      { error: "wilaya_id and provider are required" },
      { status: 400 },
    );
  }

  const wilayaId = Number(wilayaIdParam);
  if (!Number.isInteger(wilayaId) || wilayaId < 1) {
    return NextResponse.json({ error: "invalid wilaya_id" }, { status: 400 });
  }

  if (provider === "dhd") {
    const [communes, tarif] = await Promise.all([
      getDhdCommunes(wilayaId),
      getDhdTarif(wilayaId),
    ]);
    return NextResponse.json({
      communes,
      tarif: tarif
        ? {
            livraison: tarif.tarifLivraison,
            stopdesk: tarif.tarifStopdeskLivraison,
            echange: tarif.tarifEchange,
            stopdeskEchange: tarif.tarifStopdeskEchange,
          }
        : null,
    });
  }

  if (provider === "yalidine") {
    const communes = await getYalidineCommunes(wilayaId);
    return NextResponse.json({ communes, tarif: null });
  }

  return NextResponse.json(
    { error: "provider must be dhd or yalidine" },
    { status: 400 },
  );
}
