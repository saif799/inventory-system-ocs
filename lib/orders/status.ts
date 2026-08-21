import { db } from "@/lib/db";
import { stautsGroupsTable } from "@/lib/schema";

/**
 * The internal status names in status_groups_table.name. Not an exhaustive
 * closed set — the table is admin-editable — but these four are relied on by
 * name elsewhere in the app (defaults, cancel/retour handling, analytics).
 */
export type OrderStatus = "prete_a_expedier" | "Livre" | "retour" | "Cancel";

/** Name form of READY_TO_SHIP_STATUS_ID — for UI code that filters/badges by name. */
export const READY_TO_SHIP_STATUS_NAME: OrderStatus = "prete_a_expedier";

// Hardcoded because these ids are relied on synchronously (schema defaults,
// SQL filters, a status set before the courier confirms cancellation) where
// an async table lookup isn't an option. This module is the single place
// they're defined; nothing else should inline them.
export const READY_TO_SHIP_STATUS_ID = "404332b3-998f-498f-a325-3e4ecf6c3bbb"; // "prete_a_expedier"
export const DELIVERED_STATUS_ID = "830826fd-80f5-4a29-829b-6421264c7695"; // "Livre"
export const RETURNED_STATUS_ID = "e4983321-f0c7-452d-8b36-68d42dfb7be4"; // "retour"
export const CANCELED_STATUS_ID = "e01a36c1-087c-46ab-aa4c-12b1a5186bf1"; // "Cancel"

export type StatusGroupRow = {
  id: string;
  name: string;
  external_statuses: string[];
};

/** The full status_groups_table, unfiltered — callers that also need external_statuses. */
export async function getAllStatusGroups(): Promise<StatusGroupRow[]> {
  return db.select().from(stautsGroupsTable);
}

export function buildNameToIdMap(rows: { id: string; name: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) map[row.name] = row.id;
  return map;
}

export function buildIdToNameMap(rows: { id: string; name: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) map[row.id] = row.name;
  return map;
}
