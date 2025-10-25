import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core"

export const shoeModels = sqliteTable("shoe_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelName: text("model_name").notNull(),
})

export const shoes = sqliteTable("shoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .notNull()
    .references(() => shoeModels.id),
  color: text("color").notNull(),
  barcode: text("barcode").notNull().unique(),
})

export const shoeInventory = sqliteTable("shoe_inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shoeId: integer("shoe_id")
    .notNull()
    .references(() => shoes.id),
  size: text("size").notNull(),
  quantity: integer("quantity").notNull().default(0),
})
