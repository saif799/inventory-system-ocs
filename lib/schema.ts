import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const shoeModels = pgTable("shoe_models", {
  id: uuid().primaryKey().defaultRandom(),
  modelName: varchar("model_name").notNull(),
});

export const shoes = pgTable("shoes", {
  id: varchar().primaryKey(),
  modelId: uuid("model_id")
    .notNull()
    .references(() => shoeModels.id),
  color: varchar("color").notNull(),
  // barcode moved to inventory (size-specific)
});

export const ordersTable = pgTable("orders", {
  id: varchar("id").primaryKey(),
  reference: varchar("reference"),
  nom_client: varchar("nom_client").notNull(),
  telephone: varchar("telephone").notNull(),
  telephone_2: varchar("telephone_2"),
  adresse: varchar("adresse").notNull(),
  commune: varchar("commune").notNull(),
  code_wilaya: varchar("code_wilaya").notNull(),
  montant: varchar("montant").notNull(),
  remarque: varchar("remarque"),
  shoeInventoryId: uuid("shoe_inventory_id")
    .notNull()
    .references(() => shoeInventory.id),
  type: integer("type").notNull(),
  source: varchar("source").notNull().default("i"),
  stop_desk: integer("stop_desk").notNull(),
  status: varchar("status").notNull().default("prete_a_expedier"),
  statusId: uuid("status_id")
    .notNull()
    .references(() => stautsGroupsTable.id)
    .default("404332b3-998f-498f-a325-3e4ecf6c3bbb"),
  saif_paid: boolean("saif_paid").notNull().default(false),
  createdAt: date("created_at").notNull().defaultNow(),
  updatedAt: date("updated_at").notNull().defaultNow(),
});

export const shoeInventory = pgTable("shoe_inventory", {
  id: uuid().primaryKey().defaultRandom(),
  shoeId: varchar("shoe_id")
    .notNull()
    .references(() => shoes.id),
  size: varchar("size").notNull(),
  quantity: integer("quantity").notNull().default(0),
  createdAt: date("created_at").notNull().defaultNow(),
});

export const stautsGroupsTable = pgTable("status_groups_table", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar("status_name").notNull(),

  external_statuses: varchar("external_statuses")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
});
export const ImageNotifierTable = pgTable("image_notifier_table", {
  id: uuid().primaryKey().defaultRandom(),
  shoeInventoryId: uuid("shoe_inventory_id")
    .notNull()
    .references(() => shoeInventory.id),
  orderId: varchar("order_id")
    .notNull()
    .references(() => ordersTable.id),
});
