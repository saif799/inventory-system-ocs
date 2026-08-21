import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { LendedShoes, shoeInventory } from "@/lib/schema";

/** Correlated subquery: total units of one shoeInventory row currently lent out (any borrower). */
export function totalLentSql(inventoryIdRef: SQL | PgColumn) {
  return sql<number>`COALESCE((
    SELECT SUM(${LendedShoes.quantity})
    FROM ${LendedShoes}
    WHERE ${LendedShoes.shoeInventoryId} = ${inventoryIdRef}
  ), 0)`;
}

/**
 * Store-Held Stock: units at the owner's own premises (Physical Quantity minus
 * everything currently lent out). Governs what can be handed to a Borrower and
 * what /admin/rebalance chases — NEVER sellability, which Physical Quantity
 * (shoeInventory.quantity) governs on its own. See
 * docs/adr/0003-borrower-ledger-is-a-location-ledger.md.
 */
export function storeHeldStockSql(inventoryIdRef: SQL | PgColumn) {
  return sql<number>`${shoeInventory.quantity} - ${totalLentSql(inventoryIdRef)}`;
}

/** Same concept, computed from numbers already in hand (client-side, guard checks). */
export function storeHeldStock(quantity: number, lent: number): number {
  return Math.max(0, quantity - lent);
}
