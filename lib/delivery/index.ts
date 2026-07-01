import { dhdProvider } from "./dhd";
import { yalidineProvider } from "./yalidine";
import type { DeliveryProvider, DeliveryProviderName } from "./types";

export * from "./types";

export const DELIVERY_PROVIDERS: DeliveryProvider[] = [
  dhdProvider,
  yalidineProvider,
];

export function getProvider(name: string | null | undefined): DeliveryProvider {
  switch (name) {
    case "yalidine":
      return yalidineProvider;
    case "dhd":
    default:
      return dhdProvider;
  }
}

export function isProviderName(name: unknown): name is DeliveryProviderName {
  return name === "dhd" || name === "yalidine";
}
