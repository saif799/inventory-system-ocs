/**
 * Provider-neutral delivery coverage shape.
 *
 * This is the only vocabulary the client ever sees. Every courier quirk —
 * DHD's `has_stop_desk` flag vs Yalidine's nullable `stopdesk_id`, DHD's
 * wilaya-level tarif vs Yalidine's commune-level `express_desk`, `varchar`
 * money vs `integer` money — is flattened into it by the adapters in
 * [coverageData.ts](./coverageData.ts) and never leaks past that boundary.
 *
 * Types only: safe to import from client components.
 */

/** A way a parcel reaches the customer. Serialised on the wire as `stop_desk` 0|1. */
export type DeliveryMode = "home" | "desk";

/** `stop_desk` is the provider-facing encoding of a DeliveryMode. */
export const MODE_TO_STOP_DESK: Record<DeliveryMode, 0 | 1> = {
  home: 0,
  desk: 1,
};

export function stopDeskToMode(stopDesk: number): DeliveryMode {
  return stopDesk === 1 ? "desk" : "home";
}

export type ModeAvailability = {
  available: boolean;
  /** Integer DZD. Meaningless when `available` is false. */
  fee: number;
  /** Yalidine center_id, needed at parcel creation. Null for DHD. */
  deskId?: number | null;
};

export type CommuneCoverage = {
  /** Provider-native commune spelling — what gets submitted on the order. */
  name: string;
  modes: Record<DeliveryMode, ModeAvailability>;
};

/** A commune is offerable at all only if some mode can actually deliver to it. */
export function isDeliverable(c: CommuneCoverage): boolean {
  return c.modes.home.available || c.modes.desk.available;
}
