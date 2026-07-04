/**
 * Yalidine parcel API (server-side): create, delete, and status history.
 * Set in `.env`:
 * - YALIDINE_API_ID
 * - YALIDINE_API_ID_TOKEN
 * - YALIDINE_API_ID_URL (e.g. https://api.yalidine.app/v1/)
 */

/** Read + validate the Yalidine config once, shared by every request below. */
function getYalidineConfig() {
  const apiId = process.env.YALIDINE_API_ID;
  const apiToken = process.env.YALIDINE_API_ID_TOKEN;
  let baseUrl = process.env.YALIDINE_API_ID_URL;

  if (!apiId || !apiToken || !baseUrl) {
    throw new Error(
      "Missing Yalidine configuration: set YALIDINE_API_ID, YALIDINE_API_ID_TOKEN, and YALIDINE_API_ID_URL",
    );
  }
  // Endpoints are appended as `parcels`, `histories/`, etc. so the base must
  // end with a slash regardless of how the env var is written.
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  return { apiId, apiToken, baseUrl };
}

function yalidineHeaders(): Record<string, string> {
  const { apiId, apiToken } = getYalidineConfig();
  return {
    "Content-Type": "application/json",
    "X-API-ID": apiId,
    "X-API-TOKEN": apiToken,
  };
}

/** Parse a Yalidine response body as JSON, falling back to raw text. */
async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export type YalidineParcelPayload = {
  order_id: string;
  from_wilaya_name: string;
  firstname: string;
  familyname: string;
  contact_phone: string;
  address: string;
  to_commune_name: string;
  to_wilaya_name: string;
  product_list: string;
  price: number;
  height: number;
  width: number;
  length: number;
  weight: number;
  freeshipping: boolean;
  is_stopdesk: boolean;
  stopdesk_id?: number | null;
  /** API accepts boolean; use `0` / `1` if you prefer numeric flags. */
  has_exchange: number | boolean;
  product_to_collect?: string | null;
  /** Optional; defaults used if omitted (API often expects these). */
  do_insurance?: boolean;
  declared_value?: number;
};

/** Raw API response shape for POST /parcels (array of one parcel). */
export type YalidineCreateParcelApiResponse = Record<
  string,
  {
    success: boolean;
    order_id: string;
    tracking: string | null;
    import_id: number | null;
    label: string | null;
    labels: string | null;
    message: string;
  }
>;

function toApiBody(payload: YalidineParcelPayload): Record<string, unknown> {
  const hasExchange =
    typeof payload.has_exchange === "boolean"
      ? payload.has_exchange
      : payload.has_exchange !== 0;

  const body: Record<string, unknown> = {
    order_id: payload.order_id,
    from_wilaya_name: payload.from_wilaya_name,
    firstname: payload.firstname,
    familyname: payload.familyname,
    contact_phone: payload.contact_phone.replace(/,\s*$/, "").trim(),
    address: payload.address,
    to_commune_name: payload.to_commune_name,
    to_wilaya_name: payload.to_wilaya_name,
    product_list: payload.product_list,
    price: payload.price,
    height: payload.height,
    width: payload.width,
    length: payload.length,
    weight: payload.weight,
    freeshipping: payload.freeshipping,
    is_stopdesk: payload.is_stopdesk,
    has_exchange: hasExchange,
    do_insurance: payload.do_insurance ?? false,
    declared_value: payload.declared_value ?? 0,
  };

  if (payload.is_stopdesk && payload.stopdesk_id != null) {
    body.stopdesk_id = payload.stopdesk_id;
  }

  if (payload.product_to_collect != null && payload.product_to_collect !== "") {
    body.product_to_collect = payload.product_to_collect;
  }

  return body;
}

export type CreateYalidineParcelResult = {
  ok: boolean;
  status: number;
  data: YalidineCreateParcelApiResponse | unknown;
};

/**
 * Creates one parcel on Yalidine (POST body is a single-element array, per API).
 */
export async function createYalidineParcel(
  payload: YalidineParcelPayload,
): Promise<CreateYalidineParcelResult> {
  const { baseUrl } = getYalidineConfig();

  const url = `${baseUrl}parcels`;
  const body = JSON.stringify([toApiBody(payload)]);

  const response = await fetch(url, {
    method: "POST",
    headers: yalidineHeaders(),
    body,
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await parseBody(response),
  };
}

/**
 * Deletes one parcel by tracking. Yalidine only allows deletion while the
 * parcel's latest status is "En préparation".
 *
 * Response is an array of `{ tracking, deleted }`; `deleted: false` means the
 * deletion was impossible (progressed past prep, misspelled, nonexistent, or
 * already deleted). The caller reads `data` to decide whether to restore stock.
 */
export type YalidineDeleteRow = { tracking: string; deleted: boolean };

export async function deleteYalidineParcel(
  tracking: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { baseUrl } = getYalidineConfig();

  const response = await fetch(
    `${baseUrl}parcels/${encodeURIComponent(tracking)}`,
    {
      method: "DELETE",
      headers: yalidineHeaders(),
    },
  );

  return {
    ok: response.ok,
    status: response.status,
    data: await parseBody(response),
  };
}

type YalidineHistoryRow = {
  tracking?: string;
  status?: string;
  date_status?: string;
};

/**
 * Returns the CURRENT status of each given parcel via GET /histories.
 *
 * Histories is a per-event timeline, so we filter by our own trackings (chunked
 * to keep the query string sane) and, because the default ordering is
 * `date_status DESC`, keep the FIRST row seen per tracking — that's its latest
 * status. Pagination is followed while the response reports `has_more`.
 */
export async function fetchYalidineLatestStatuses(
  trackings: string[],
): Promise<Array<{ tracking: string; status: string }>> {
  if (trackings.length === 0) return [];

  const { baseUrl } = getYalidineConfig();
  const headers = yalidineHeaders();

  const CHUNK_SIZE = 50;
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 100; // safety valve against a runaway has_more loop
  const latest = new Map<string, string>();

  for (let i = 0; i < trackings.length; i += CHUNK_SIZE) {
    const batch = trackings.slice(i, i + CHUNK_SIZE);
    const trackingParam = batch.map(encodeURIComponent).join(",");

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url =
        `${baseUrl}histories/?tracking=${trackingParam}` +
        `&fields=tracking,status,date_status&order_by=date_status&desc` +
        `&page=${page}&page_size=${PAGE_SIZE}`;

      const response = await fetch(url, { method: "GET", headers });
      if (!response.ok) {
        throw new Error(`Yalidine histories failed (HTTP ${response.status})`);
      }

      const json = (await parseBody(response)) as
        | { data?: YalidineHistoryRow[]; has_more?: boolean }
        | YalidineHistoryRow[]
        | null;

      const rows: YalidineHistoryRow[] = Array.isArray(json)
        ? json
        : (json?.data ?? []);

      for (const row of rows) {
        // First row seen per tracking wins (date_status DESC == most recent).
        if (row?.tracking && row?.status && !latest.has(row.tracking)) {
          latest.set(row.tracking, row.status);
        }
      }

      const hasMore = !Array.isArray(json) && json?.has_more === true;
      if (!hasMore || rows.length === 0) break;
    }
  }

  return Array.from(latest, ([tracking, status]) => ({ tracking, status }));
}
