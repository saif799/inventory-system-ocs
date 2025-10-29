import { date, integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const shoeModels = pgTable("shoe_models", {
  id: uuid().primaryKey().defaultRandom(),
  modelName: varchar("model_name").notNull(),
});

export const shoes = pgTable("shoes", {
  id: uuid().primaryKey().defaultRandom(),
  modelId: uuid("model_id")
    .notNull()
    .references(() => shoeModels.id),
  color: varchar("color").notNull(),
  // barcode moved to inventory (size-specific)
});

export const shoeInventory = pgTable("shoe_inventory", {
  id: uuid().primaryKey().defaultRandom(),
  shoeId: uuid("shoe_id")
    .notNull()
    .references(() => shoes.id),
  size: varchar("size").notNull(),
  quantity: integer("quantity").notNull().default(0),
  createdAt: date("created_at").notNull().defaultNow(),
});
