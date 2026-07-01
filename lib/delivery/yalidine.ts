import {
  createYalidineParcel,
  type YalidineCreateParcelApiResponse,
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
  express_desk: number | null;
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
    if (commune.express_desk == null) {
      throw new Error(
        `Yalidine commune "${input.commune}" has no stop-desk id (express_desk)`,
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
      stopdesk_id: commune.express_desk,
      has_exchange: input.type === 2,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteOrder(_tracking: string): Promise<DeleteOrderResult> {
    // TODO(yalidine): implement once the delete/cancel endpoint docs are provided.
    throw new Error("Yalidine order deletion is not implemented yet");
  },

  async fetchStatuses(): Promise<ProviderStatus[]> {
    // TODO(yalidine): implement once the status/list endpoint docs are provided.
    // Returning empty keeps multi-provider sync working (Yalidine orders simply
    // aren't status-synced yet) instead of breaking the whole sync.
    return [];
  },
};
