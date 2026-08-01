/**
 * POST /api/settings/sync/yalidine
 *
 * Syncs coverage data from Yalidine's API into the DB:
 *   1. GET /v1/communes (paginated via links.next)
 *      → upsert yalidine_communes (name, wilaya, has_stop_desk, is_deliverable)
 *      → derive and upsert yalidine_wilayas from distinct wilaya_id values
 *   2. GET /centers/ (paginated)
 *      → build commune_id → center_id map
 *      → update stopdesk_id + express_desk on yalidine_communes
 *
 * Returns a summary of changes.
 */

import { NextResponse } from "next/server";
import { eq, sql, notInArray } from "drizzle-orm";
import { txClient } from "@/lib/db";
import { yalidineCommunes, yalidineWilayas } from "@/lib/schema";
interface FeesApiResponse {
  per_commune?: Record<string, FeeCommune>;
}

interface FeeCommune {
  commune_id: number;
  express_desk: number | null;
}

// ── Yalidine API types ────────────────────────────────────────────────────────
type YalidineCommune = {
  id: number;
  name: string;
  wilaya_id: number;
  wilaya_name: string;
  has_stop_desk: number;
  is_deliverable: number;
  delivery_time_parcel?: number;
  delivery_time_payment?: number;
};

type YalidinePagedResponse<T> = {
  has_more: boolean;
  total_data?: number;
  data: T[];
  links?: { self?: string; next?: string };
};

const DEFAULT_RETRY_DELAY_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 8;

type YalidineCenter = {
  center_id: number;
  commune_id: number;
  commune_name: string;
  wilaya_id: number;
  wilaya_name?: string;
  express_desk?: number | null;
};
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getRetryDelayMs(response: Response): number {
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    const asSeconds = Number(retryAfterHeader);
    if (!Number.isNaN(asSeconds) && asSeconds >= 0) {
      return asSeconds * 1000;
    }

    const asDateMs = Date.parse(retryAfterHeader);
    if (!Number.isNaN(asDateMs)) {
      return Math.max(0, asDateMs - Date.now());
    }
  }

  const resetHeader =
    response.headers.get("x-ratelimit-reset") ??
    response.headers.get("x-rate-limit-reset");
  if (resetHeader) {
    const asSeconds = Number(resetHeader);
    if (!Number.isNaN(asSeconds) && asSeconds > 0) {
      const resetMs = asSeconds > 10_000_000_000 ? asSeconds : asSeconds * 1000;
      return Math.max(0, resetMs - Date.now());
    }
  }

  return DEFAULT_RETRY_DELAY_MS;
}

export async function fetchFeesForWilayaYalidin(
  fromWilayaId: number,
  toWilayaId: number,
  headers: Record<string, string>,
): Promise<FeesApiResponse> {
  const url = `https://api.yalidine.app/v1/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`;
  let attempt = 0;

  while (true) {
    const response = await fetch(url, { headers });
    if (response.ok) {
      return (await response.json()) as FeesApiResponse;
    }

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      attempt += 1;
      const delayMs = getRetryDelayMs(response);
      console.warn(
        `Rate limited for wilaya ${toWilayaId}. Retry ${attempt}/${MAX_RATE_LIMIT_RETRIES} in ${Math.ceil(
          delayMs / 1000,
        )}s...`,
      );
      await sleep(delayMs);
      continue;
    }

    const errorText = await response.text();
    throw new Error(
      `Fees request failed for to_wilaya_id=${toWilayaId} (${response.status}): ${errorText}`,
    );
  }
}

async function fetchWithRetry(
  fn: () => Promise<FeesApiResponse>,
  maxRetries = 3,
  delayMs = 15_000,
): Promise<FeesApiResponse> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isConnectError =
        err instanceof TypeError && err.message === "fetch failed";
      if (!isConnectError || attempt === maxRetries) throw err;
      console.warn(
        `Connect failed, retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`,
      );
      await sleep(delayMs);
    }
  }
  throw new Error("unreachable");
}
function yalidineHeaders(): Record<string, string> {
  const apiId = process.env.YALIDINE_API_ID;
  const apiToken = process.env.YALIDINE_API_ID_TOKEN;
  if (!apiId || !apiToken) {
    throw new Error(
      "Missing YALIDINE_API_ID or YALIDINE_API_ID_TOKEN env variables",
    );
  }
  return { "X-API-ID": apiId, "X-API-TOKEN": apiToken };
}

function baseUrl(): string {
  let url = process.env.YALIDINE_API_ID_URL ?? "https://api.yalidine.app/v1/";
  if (!url.endsWith("/")) url += "/";
  return url;
}

/** Fetch all pages of a paginated Yalidine endpoint. */
async function fetchAllPages<T>(
  firstUrl: string,
  headers: Record<string, string>,
): Promise<T[]> {
  const all: T[] = [];
  let nextUrl: string | null = firstUrl;
  let pageCount = 0;
  const MAX_PAGES = 200;

  while (nextUrl && pageCount < MAX_PAGES) {
    pageCount++;
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Yalidine request failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as YalidinePagedResponse<T>;
    all.push(...(json.data ?? []));

    // Follow links.next for the next page
    nextUrl = json.has_more && json.links?.next ? json.links.next : null;
  }

  return all;
}

export async function POST() {
  try {
    const headers = yalidineHeaders();
    const base = baseUrl();
    const now = new Date();

    // ── 1. Fetch all communes ───────────────────────────────────────────────
    const communes = await fetchAllPages<YalidineCommune>(
      `${base}communes/?page_size=200`,
      headers,
    );

    // ── 2. Fetch all centers (for stopdesk_id + express_desk) ──────────────
    const centers = await fetchAllPages<YalidineCenter>(
      `${base}centers/?page_size=200`,
      headers,
    );

    const wilayaMap = new Map<number, string>();
    for (const c of communes) {
      if (!wilayaMap.has(c.wilaya_id)) {
        wilayaMap.set(c.wilaya_id, c.wilaya_name);
      }
    }

    let perCoummuneFees: Record<number, FeeCommune> = {};
    for (const [wilayaId] of wilayaMap) {
      const fees = await fetchWithRetry(() =>
        fetchFeesForWilayaYalidin(19, wilayaId, headers),
      );
      const perCommune = fees.per_commune ?? {};
      for (const [communeId, feeData] of Object.entries(perCommune)) {
        perCoummuneFees[Number(communeId)] = feeData;
      }
    }

    // Build commune_id → { center_id, express_desk } map (first-seen wins)
    const centerByCommune = new Map<
      number,
      { centerId: number; expressDesk: number | null }
    >();
    for (const c of centers) {
      if (c.commune_id != null && !centerByCommune.has(c.commune_id)) {
        centerByCommune.set(c.commune_id, {
          centerId: c.center_id,
          expressDesk: c.express_desk ?? null,
        });
      }
    }

    // ── Write to DB ─────────────────────────────────────────────────────────
    const db = txClient();

    const result = await db.transaction(async (tx) => {
      // Derive unique wilayas from commune list

      // Upsert wilayas
      const wilayaRows = Array.from(wilayaMap.entries()).map(([id, name]) => ({
        wilayaId: id,
        name,
        syncedAt: now,
      }));
      await tx
        .insert(yalidineWilayas)
        .values(wilayaRows)
        .onConflictDoUpdate({
          target: yalidineWilayas.wilayaId,
          set: {
            name: sql`excluded.name`,
            syncedAt: sql`excluded.synced_at`,
          },
        });

      // Remove wilayas no longer in Yalidine's network
      const activeWilayaIds = Array.from(wilayaMap.keys());
      let wilayasRemoved = 0;
      if (activeWilayaIds.length > 0) {
        const deleted = await tx
          .delete(yalidineWilayas)
          .where(notInArray(yalidineWilayas.wilayaId, activeWilayaIds))
          .returning();
        wilayasRemoved = deleted.length;
      }

      // Upsert communes (enriched with center data)
      const communeRows = communes.map((c) => {
        const center = centerByCommune.get(c.id);
        const feeData = perCoummuneFees[c.id];
        return {
          communeId: c.id,
          wilayaId: c.wilaya_id,
          name: c.name,
          wilayaName: c.wilaya_name,
          hasStopDesk: c.has_stop_desk,
          isDeliverable: c.is_deliverable,
          stopdeskId: center?.centerId ?? null,
          expressDesk: feeData?.express_desk ?? null,
          syncedAt: now,
        };
      });

      const CHUNK = 500;
      let communesUpserted = 0;
      for (let i = 0; i < communeRows.length; i += CHUNK) {
        const batch = communeRows.slice(i, i + CHUNK);
        const inserted = await tx
          .insert(yalidineCommunes)
          .values(batch)
          .onConflictDoUpdate({
            target: yalidineCommunes.communeId,
            set: {
              wilayaId: sql`excluded.wilaya_id`,
              name: sql`excluded.name`,
              wilayaName: sql`excluded.wilaya_name`,
              hasStopDesk: sql`excluded.has_stop_desk`,
              isDeliverable: sql`excluded.is_deliverable`,
              stopdeskId: sql`excluded.stopdesk_id`,
              expressDesk: sql`excluded.express_desk`,
              syncedAt: sql`excluded.synced_at`,
            },
          })
          .returning();
        communesUpserted += inserted.length;
      }

      // Remove communes for wilayas no longer covered
      let communesRemoved = 0;
      if (activeWilayaIds.length > 0) {
        const removed = await tx
          .delete(yalidineCommunes)
          .where(notInArray(yalidineCommunes.wilayaId, activeWilayaIds))
          .returning();
        communesRemoved = removed.length;
      }

      const withDesk = communeRows.filter((c) => c.stopdeskId != null).length;

      return {
        wilayas: {
          total: wilayaRows.length,
          removed: wilayasRemoved,
        },
        communes: {
          total: communeRows.length,
          upserted: communesUpserted,
          removed: communesRemoved,
          withDesk,
          withoutDesk: communeRows.length - withDesk,
        },
        centers: {
          total: centers.length,
          mapped: centerByCommune.size,
        },
        syncedAt: now.toISOString(),
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync/yalidine] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
