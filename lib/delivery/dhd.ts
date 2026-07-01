import type { DeliveryOrderType } from "@/lib/dataTypes";
import type {
  CreateOrderResult,
  DeleteOrderResult,
  DeliveryProvider,
  NormalizedOrderInput,
  ProviderStatus,
} from "./types";

const BASE_URL = "https://platform.dhd-dz.com/api/v1";

function authHeader() {
  return `Bearer ${process.env.NEXT_PUBLIC_DHD_API_KEY}`;
}

/**
 * DHD / Ecotrack provider. This just relocates the fetch calls that previously
 * lived inline in the order/status routes — behaviour is unchanged.
 */
export const dhdProvider: DeliveryProvider = {
  name: "dhd",

  async createOrder(input: NormalizedOrderInput): Promise<CreateOrderResult> {
    const res = await fetch(`${BASE_URL}/create/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader(),
      },
      body: JSON.stringify({
        nom_client: input.nom_client,
        telephone: input.telephone,
        adresse: input.adresse,
        code_wilaya: input.code_wilaya,
        commune: input.commune,
        montant: input.montant,
        reference: input.produit,
        produit: input.produit,
        type: input.type,
        stop_desk: input.stop_desk,
        remarque: input.remarque,
        telephone_2: input.telephone_2,
      }),
    });

    if (!res.ok) {
      throw new Error("DHD failed to create order");
    }

    const apiResponse = await res.json();
    const tracking: string | undefined = apiResponse?.tracking;
    if (!tracking) {
      throw new Error("DHD did not return a tracking number");
    }
    return { tracking };
  },

  async deleteOrder(tracking: string): Promise<DeleteOrderResult> {
    const res = await fetch(
      `${BASE_URL}/delete/order?tracking=${encodeURIComponent(tracking)}`,
      {
        method: "DELETE",
        headers: { authorization: authHeader() },
      },
    );

    if (!res.ok) {
      throw new Error("DHD failed to delete order");
    }

    const apiResponse = await res.json();
    return { ok: apiResponse?.delete === "success" };
  },

  async fetchStatuses(): Promise<ProviderStatus[]> {
    const res = await fetch(`${BASE_URL}/get/orders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader(),
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch orders from DHD");
    }

    const data: { data: Array<DeliveryOrderType> } = await res.json();
    return data.data.map((o) => ({ tracking: o.tracking, status: o.status }));
  },
};
