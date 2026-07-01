import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { neon, Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// The neon-http driver is fast for one-shot queries but has NO transaction
// support. We keep it as the default client for every read / non-atomic write,
// and lazily spin up a WebSocket Pool client (which DOES support interactive
// transactions) only for the handful of write paths that need atomicity.
neonConfig.webSocketConstructor = ws;

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

let poolDb: ReturnType<typeof drizzleWs> | null = null;

/**
 * Returns a Drizzle client backed by a WebSocket Pool that supports
 * `.transaction()`. The pool is created once, on first use, so read-only
 * requests never pay the WebSocket cost.
 */
export function txClient() {
  if (!poolDb) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    poolDb = drizzleWs(pool);
  }
  return poolDb;
}

/** A transaction handle produced by `txClient().transaction(...)`. */
export type Tx = Parameters<
  Parameters<ReturnType<typeof txClient>["transaction"]>[0]
>[0];

/** Anything that can run queries: the default db, or a transaction handle. */
export type Executor = typeof db | Tx;

// In-memory storage

// Legacy in-memory store kept for reference:
// export const dB = {
//   shoeModels: {
//     getAll: () => shoeModels,
//     create: (modelName: string) => {
//       const newModel: ShoeModel = { id: nextModelId++, modelName };
//       shoeModels.push(newModel);
//       return newModel;
//     },
//   },
//   shoes: {
//     create: (modelId: number, color: string, barcode: string) => {
//       const newShoe: Shoe = { id: nextShoeId++, modelId, color, barcode };
//       shoes.push(newShoe);
//       return newShoe;
//     },
//   },
//   inventory: {
//     getAll: () => {
//       return shoeInventory.map((item) => {
//         const shoe = shoes.find((s) => s.id === item.shoeId);
//         const model = shoeModels.find((m) => m.id === shoe?.modelId);
//         return {
//           id: item.id,
//           modelName: model?.modelName || "Unknown",
//           color: shoe?.color || "Unknown",
//           size: item.size,
//           quantity: item.quantity,
//           barcode: shoe?.barcode || "Unknown",
//         };
//       });
//     },
//     create: (shoeId: number, size: string, quantity: number) => {
//       const newItem: ShoeInventoryItem = {
//         id: nextInventoryId++,
//         shoeId,
//         size,
//         quantity,
//       };
//       shoeInventory.push(newItem);
//       return newItem;
//     },
//     update: (id: number, quantity: number) => {
//       const item = shoeInventory.find((i) => i.id === id);
//       if (item) {
//         item.quantity = quantity;
//         return item;
//       }
//       return null;
//     },
//     delete: (id: number) => {
//       const index = shoeInventory.findIndex((i) => i.id === id);
//       if (index !== -1) {
//         shoeInventory.splice(index, 1);
//         return true;
//       }
//       return false;
//     },
//     getById: (id: number) => {
//       return shoeInventory.find((i) => i.id === id);
//     },
//   },
// };
