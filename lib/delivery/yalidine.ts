import {
  createYalidineParcel,
  deleteYalidineParcel,
  fetchYalidineLatestStatuses,
  type YalidineCreateParcelApiResponse,
  type YalidineDeleteRow,
} from "@/lib/Yalidin/parcel";
import yalidineCommunes from "@/yalidinCommunes_withExpressDesk.json";
import type {
  CreateOrderResult,
  DeleteOrderResult,
  DeliveryProvider,
  NormalizedOrderInput,
  ProviderStatus,
} from "./types";

type YalidineCommune = {
  id: number;
  name: string;
  wilaya_name: string;
  has_stop_desk: number;
  // Stop-desk delivery price (DA), shown as a label in the order form. Not sent
  // to the create endpoint.
  express_desk: number | null;
  // Yalidine center id, used as the parcel's stopdesk_id (from the Centers
  // endpoint). Null when the commune has no stop-desk center.
  stopdesk_id: number | null;
};

const COMMUNES = yalidineCommunes as Record<string, YalidineCommune[]>;

// One shoebox default for every parcel. Yalidine still computes delivery fees
// from the wilaya; this only satisfies the required package fields.
const YALIDINE_PARCEL_DEFAULTS = {
  weight: 1, // kg
  height: 12,
  width: 20,
  length: 30, // cm
  freeshipping: false,
};

/** Split "Ahmed Ben Ali" -> { firstname: "Ahmed", familyname: "Ben Ali" }. */
function splitName(fullName: string): { firstname: string; familyname: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstname: fullName.trim() || "-", familyname: "-" };
  }
  return { firstname: parts[0], familyname: parts.slice(1).join(" ") };
}

/**
 * Find the Yalidine commune record so we can send Yalidine's own commune +
 * wilaya spelling and the stop-desk id. Using this file (not the DHD one)
 * guarantees the names validate against Yalidine.
 */
function findCommune(
  codeWilaya: string,
  communeName: string,
): YalidineCommune | undefined {
  const list = COMMUNES[String(codeWilaya)];
  if (!list) return undefined;
  return list.find((c) => c.name === communeName);
}

export const yalidineProvider: DeliveryProvider = {
  name: "yalidine",

  async createOrder(input: NormalizedOrderInput): Promise<CreateOrderResult> {
    const commune = findCommune(input.code_wilaya, input.commune);
    if (!commune) {
      throw new Error(
        `Yalidine has no stop-desk commune "${input.commune}" in wilaya ${input.code_wilaya}`,
      );
    }
    if (commune.stopdesk_id == null) {
      throw new Error(
        `Yalidine commune "${input.commune}" has no stop-desk center`,
      );
    }

    const { firstname, familyname } = splitName(input.nom_client);
    // The order_id is OUR external reference; Yalidine returns the tracking.
    const orderRef = crypto.randomUUID();

    const result = await createYalidineParcel({
      order_id: orderRef,
      from_wilaya_name: process.env.YALIDINE_FROM_WILAYA ?? "Alger",
      firstname,
      familyname,
      contact_phone: input.telephone,
      address: input.adresse,
      to_commune_name: commune.name,
      to_wilaya_name: commune.wilaya_name,
      product_list: input.produit,
      price: Number(input.montant) || 0,
      height: YALIDINE_PARCEL_DEFAULTS.height,
      width: YALIDINE_PARCEL_DEFAULTS.width,
      length: YALIDINE_PARCEL_DEFAULTS.length,
      weight: YALIDINE_PARCEL_DEFAULTS.weight,
      freeshipping: YALIDINE_PARCEL_DEFAULTS.freeshipping,
      is_stopdesk: true, // Yalidine is used desk-only in this app
      stopdesk_id: commune.stopdesk_id,
      has_exchange: input.type === 2,
      // Yalidine requires the returned-product description whenever exchange is on.
      product_to_collect: input.type === 2 ? input.produit : null,
    });

    if (!result.ok) {
      throw new Error(`Yalidine create failed (HTTP ${result.status})`);
    }

    // Response is keyed by our order_id -> { success, tracking, message, ... }.
    const data = result.data as YalidineCreateParcelApiResponse;
    const entry = data?.[orderRef] ?? Object.values(data ?? {})[0];
    if (!entry?.success || !entry?.tracking) {
      throw new Error(
        `Yalidine did not return a tracking number: ${entry?.message ?? "unknown error"}`,
      );
    }

    return { tracking: entry.tracking };
  },

  async deleteOrder(tracking: string): Promise<DeleteOrderResult> {
    const result = await deleteYalidineParcel(tracking);
    if (!result.ok) {
      throw new Error(`Yalidine delete failed (HTTP ${result.status})`);
    }

    // Response is an array of { tracking, deleted }. `deleted: false` means the
    // parcel can't be deleted (progressed past "En préparation", nonexistent,
    // or already deleted) — return ok:false so the route leaves stock untouched.
    const rows = Array.isArray(result.data)
      ? (result.data as YalidineDeleteRow[])
      : [];
    const entry = rows.find((r) => r?.tracking === tracking) ?? rows[0];
    return { ok: entry?.deleted === true };
  },

  async fetchStatuses(trackings?: string[]): Promise<ProviderStatus[]> {
    // No Yalidine orders to sync -> skip the API call entirely.
    if (!trackings || trackings.length === 0) return [];
    return fetchYalidineLatestStatuses(trackings);
  },
};
