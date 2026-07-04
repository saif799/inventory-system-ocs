import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Populate each Yalidine commune with a valid stop-desk id.
 *
 * The correct `stopdesk_id` for a parcel is a Yalidine **center** id
 * (`center_id`) from the Centers endpoint — NOT the `express_desk` fee that the
 * old `addExpressDeskToCommunes_yalidin.ts` script wrote (that field is a price
 * and Yalidine rejects it as "Unknown stopdesk_id"). This script pulls every
 * center, maps commune -> center, and rewrites the communes file's
 * `stopdesk_id`. Communes with no center get `null` (stop-desk unavailable).
 *
 * The `express_desk` field (the stop-desk delivery PRICE, shown as a label in
 * the order form) is preserved as-is from the input file — it is a separate
 * concern from the stop-desk id and is NOT sent to the create endpoint.
 *
 * Usage (from repo root):
 *   npx tsx lib/Yalidin/addCentersToCommunes_yalidin.ts [input.json] [output.json]
 * Defaults read and overwrite yalidinCommunes_withExpressDesk.json in place.
 */

interface CommuneInput {
  id: number;
  name: string;
  wilaya_name: string;
  has_stop_desk: number;
  // may carry the old (wrong) express_desk fee; it is dropped on output
  express_desk?: number | null;
  stopdesk_id?: number | null;
}

interface CommuneOutput {
  id: number;
  name: string;
  wilaya_name: string;
  has_stop_desk: number;
  express_desk: number | null; // stop-desk delivery price (kept for the form label)
  stopdesk_id: number | null; // Yalidine center id, sent as the parcel stopdesk_id
}

type GroupedCommunes<T> = Record<string, T[]>;

interface CenterRow {
  center_id: number;
  commune_id: number;
  commune_name: string;
  wilaya_id: number;
}

interface CentersApiResponse {
  has_more?: boolean;
  data?: CenterRow[];
}

const DEFAULT_FILE = "yalidinCommunes_withExpressDesk.json";
const PAGE_SIZE = 1000;
const MAX_PAGES = 100;

function loadEnvFiles(): void {
  for (const name of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), name);
    if (fs.existsSync(p)) dotenv.config({ path: p, override: false, quiet: true });
  }
}

function cleanEnvValue(value?: string): string {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function getConfig() {
  const apiId = cleanEnvValue(process.env.YALIDINE_API_ID);
  const apiToken = cleanEnvValue(process.env.YALIDINE_API_ID_TOKEN);
  let baseUrl = cleanEnvValue(process.env.YALIDINE_API_ID_URL);
  if (!apiId || !apiToken || !baseUrl) {
    throw new Error(
      "Missing env: YALIDINE_API_ID, YALIDINE_API_ID_TOKEN, YALIDINE_API_ID_URL are required.",
    );
  }
  if (!baseUrl.endsWith("/")) baseUrl += "/";
  return {
    baseUrl,
    headers: { "X-API-ID": apiId, "X-API-TOKEN": apiToken },
  };
}

function resolveInput(userPath: string): string {
  if (path.isAbsolute(userPath)) return userPath;
  const fromCwd = path.resolve(process.cwd(), userPath);
  if (fs.existsSync(fromCwd)) return fromCwd;
  const fromScript = path.resolve(__dirname, userPath);
  if (fs.existsSync(fromScript)) return fromScript;
  throw new Error(`File not found. Tried:\n  - ${fromCwd}\n  - ${fromScript}`);
}

/** Fetch every center and map commune_id -> primary (first-seen) center_id. */
async function fetchCentersByCommune(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<Map<number, number>> {
  const byCommune = new Map<number, number>();
  let total = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${baseUrl}centers/?page=${page}&page_size=${PAGE_SIZE}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Centers request failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as CentersApiResponse;
    const rows = json.data ?? [];
    for (const c of rows) {
      total += 1;
      if (c.commune_id != null && c.center_id != null && !byCommune.has(c.commune_id)) {
        byCommune.set(c.commune_id, c.center_id);
      }
    }
    if (!json.has_more || rows.length === 0) break;
  }

  console.log(`Fetched ${total} centers across ${byCommune.size} communes.`);
  return byCommune;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const { baseUrl, headers } = getConfig();

  const inputArg = process.argv[2] || DEFAULT_FILE;
  const outputArg = process.argv[3] || inputArg;
  const inputPath = resolveInput(inputArg);
  const outputPath = path.isAbsolute(outputArg)
    ? outputArg
    : path.resolve(process.cwd(), outputArg);

  const parsed = JSON.parse(
    fs.readFileSync(inputPath, "utf-8"),
  ) as GroupedCommunes<CommuneInput>;

  const byCommune = await fetchCentersByCommune(baseUrl, headers);

  let withDesk = 0;
  let withoutDesk = 0;
  const output: GroupedCommunes<CommuneOutput> = {};

  for (const [wilayaId, communes] of Object.entries(parsed)) {
    output[wilayaId] = communes.map((commune) => {
      const stopdesk_id = byCommune.get(commune.id) ?? null;
      if (stopdesk_id != null) withDesk += 1;
      else withoutDesk += 1;
      return {
        id: commune.id,
        name: commune.name,
        wilaya_name: commune.wilaya_name,
        has_stop_desk: commune.has_stop_desk,
        express_desk: commune.express_desk ?? null,
        stopdesk_id,
      };
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `Wrote ${outputPath}: ${withDesk} communes with a stop-desk, ${withoutDesk} without.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
