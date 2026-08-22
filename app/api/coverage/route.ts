/**
 * GET /api/coverage?wilaya_id=16&provider=dhd|yalidine
 * Returns that wilaya's communes in the provider-neutral coverage shape:
 *
 *   { communes: [{ name, modes: { home: {available, fee}, desk: {available, fee, deskId?} } }] }
 *
 * Courier-specific semantics are resolved in lib/delivery/coverageData.ts —
 * this route no longer branches on provider beyond validating it.
 *
 * GET /api/coverage?list=wilayas&provider=dhd|yalidine
 * Returns the list of wilayas covered by the given provider.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCoverage,
  getDhdWilayas,
  getYalidineWilayas,
} from "@/lib/delivery/coverageData";
import { isProviderName } from "@/lib/delivery";

const BAD_PROVIDER = { error: "provider must be dhd or yalidine" };

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const wilayaIdParam = searchParams.get("wilaya_id");
  const provider = searchParams.get("provider");
  const listWilayas = searchParams.get("list") === "wilayas";

  if (!isProviderName(provider)) {
    return NextResponse.json(BAD_PROVIDER, { status: 400 });
  }

  if (listWilayas) {
    const wilayas =
      provider === "yalidine" ? await getYalidineWilayas() : await getDhdWilayas();
    return NextResponse.json({ wilayas });
  }

  if (!wilayaIdParam) {
    return NextResponse.json(
      { error: "wilaya_id and provider are required" },
      { status: 400 },
    );
  }

  const wilayaId = Number(wilayaIdParam);
  if (!Number.isInteger(wilayaId) || wilayaId < 1) {
    return NextResponse.json({ error: "invalid wilaya_id" }, { status: 400 });
  }

  const communes = await getCoverage(provider, wilayaId);
  return NextResponse.json({ communes });
}
