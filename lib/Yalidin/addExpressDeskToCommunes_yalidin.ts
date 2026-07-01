import fs from "fs";
import path from "path";
import dotenv from "dotenv";

interface CommuneInput {
  id: number;
  name: string;
  wilaya_name: string;
  has_stop_desk: number;
}

interface GroupedCommunesInput {
  [wilayaId: string]: CommuneInput[];
}

interface CommuneOutput extends CommuneInput {
  express_desk: number | null;
}

interface GroupedCommunesOutput {
  [wilayaId: string]: CommuneOutput[];
}

interface FeeCommune {
  commune_id: number;
  express_desk: number | null;
}

interface FeesApiResponse {
  per_commune?: Record<string, FeeCommune>;
}

const DEFAULT_FROM_WILAYA_ID = 19;
const DEFAULT_INPUT = "yalidinCommunes_withStopDesk.json";
const DEFAULT_OUTPUT = "yalidinCommunes_withExpressDesk.json";
const MAX_RATE_LIMIT_RETRIES = 8;
const DEFAULT_RETRY_DELAY_MS = 60_000;
const BETWEEN_REQUESTS_DELAY_MS = 350;

function loadEnvFiles(): void {
  const envCandidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false, quiet: true });
    }
  }
}

function cleanEnvValue(value?: string): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

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

function resolvePath(userPath: string): string {
  if (path.isAbsolute(userPath)) return userPath;

  const fromCwd = path.resolve(process.cwd(), userPath);
  const fromScript = path.resolve(__dirname, userPath);

  if (fs.existsSync(fromCwd)) return fromCwd;
  if (fs.existsSync(fromScript)) return fromScript;

  throw new Error(`File not found. Tried:\n  - ${fromCwd}\n  - ${fromScript}`);
}

function getAuthHeaders(): Record<string, string> {
  let apiId = cleanEnvValue(process.env.YALIDINE_API_ID);
  let apiToken = cleanEnvValue(process.env.YALIDINE_API_ID_TOKEN);

  if (!apiId || !apiToken) {
    throw new Error(
      "Missing env vars: YALIDINE_API_ID and YALIDINE_API_ID_TOKEN are required.",
    );
  }

  return {
    "X-API-ID": apiId,
    "X-API-TOKEN": apiToken,
  };
}

async function fetchFeesForWilaya(
  fromWilayaId: number,
  toWilayaId: string,
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

async function buildCommunesWithExpressDesk(
  input: GroupedCommunesInput,
  fromWilayaId: number,
): Promise<GroupedCommunesOutput> {
  const headers = getAuthHeaders();
  const output: GroupedCommunesOutput = {};

  for (const [wilayaId, communes] of Object.entries(input)) {
    const fees = await fetchFeesForWilaya(fromWilayaId, wilayaId, headers);
    const perCommune = fees.per_commune ?? {};

    output[wilayaId] = communes.map((commune) => {
      const feeData = perCommune[String(commune.id)];
      return {
        ...commune,
        express_desk: feeData?.express_desk ?? null,
      };
    });

    console.log(`Processed wilaya ${wilayaId} (${communes.length} communes).`);
    await sleep(BETWEEN_REQUESTS_DELAY_MS);
  }

  return output;
}

async function main(): Promise<void> {
  loadEnvFiles();

  const inputArg = process.argv[2] || DEFAULT_INPUT;
  const outputArg = process.argv[3] || DEFAULT_OUTPUT;
  const fromWilayaArg = Number(process.argv[4] || DEFAULT_FROM_WILAYA_ID);

  const inputPath = resolvePath(inputArg);
  const outputPath = path.isAbsolute(outputArg)
    ? outputArg
    : path.resolve(process.cwd(), outputArg);

  const raw = fs.readFileSync(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as GroupedCommunesInput;

  const result = await buildCommunesWithExpressDesk(parsed, fromWilayaArg);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  console.log(`Written output to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Usage (from repo root):
// npx tsx lib/Yalidin/addExpressDeskToCommunes_yalidin.ts yalidinCommunes_withStopDesk.json yalidinCommunes_withExpressDesk.json 19
