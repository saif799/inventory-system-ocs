/**
 * Yalidine parcel creation (server-side).
 * Set in `.env`:
 * - YALIDINE_API_ID
 * - YALIDINE_API_ID_TOKEN
 * - YALIDINE_API_ID_URL (e.g. https://api.yalidine.app/v1/)
 */

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
  const apiId = process.env.YALIDINE_API_ID;
  const apiToken = process.env.YALIDINE_API_ID_TOKEN;
  const baseUrl = process.env.YALIDINE_API_ID_URL;

  if (!apiId || !apiToken || !baseUrl) {
    throw new Error(
      "Missing Yalidine configuration: set YALIDINE_API_ID, YALIDINE_API_ID_TOKEN, and YALIDINE_API_ID_URL",
    );
  }

  const url = `${baseUrl}api/parcel`;
  const body = JSON.stringify([toApiBody(payload)]);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-ID": apiId,
      "X-API-TOKEN": apiToken,
    },
    body,
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
