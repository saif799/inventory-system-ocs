import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

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
