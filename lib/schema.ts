import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgTable,
  timestamp,
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
  hexCode: varchar("hex_code").notNull().default("#FFFFFF"),
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

  type: integer("type").notNull(),
  source: varchar("source").notNull().default("i"),
  // Which delivery company this order was sent to. Existing rows default to DHD.
  provider: varchar("provider").notNull().default("dhd"),
  // Set when the order was placed BY a borrower (from their page): the sale is
  // drawn from the borrower's held stock, so cancel/retour must also restore it.
  // Null for normal owner orders.
  borrowerId: uuid("borrower_id").references(() => borrower.id),
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

export const LendedShoes = pgTable("lended_shoes", {
  id: uuid().primaryKey().defaultRandom(),
  shoeInventoryId: uuid("shoe_inventory_id")
    .notNull()
    .references(() => shoeInventory.id),
  borrowerId: uuid("borrower_id")
    .notNull()
    .references(() => borrower.id),
  quantity: integer("quantity").notNull().default(0),
  createdAt: date("created_at").notNull().defaultNow(),
});
export const borrower = pgTable("borrower", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: varchar("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  shoeInventoryId: uuid("shoe_inventory_id")
    .notNull()
    .references(() => shoeInventory.id),
  quantity: integer("quantity").notNull().default(1),
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
  orderId: varchar("order_id").references(() => ordersTable.id),
  // 'remove'  -> variant went out of stock, remove its photo from the gallery
  // 'restock' -> variant came back in stock, add its photo back
  direction: varchar("direction").notNull().default("remove"),
  createdAt: date("created_at").notNull().defaultNow(),
});

// NOTE: owner<->borrower rebalancing (bring-back / give-some) is computed live in
// GET /api/rebalance from shoe_inventory + lended_shoes — no stored table.

export const storeSales = pgTable("store_sales", {
  id: uuid().primaryKey().defaultRandom(),
  shoeInventoryId: uuid("shoe_inventory_id")
    .notNull()
    .references(() => shoeInventory.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// An "arrivage": a shipment/batch of shoes received together.
export const arrivals = pgTable("arrivals", {
  id: uuid().primaryKey().defaultRandom(),
  reference: varchar("reference"), // optional free-text label
  note: varchar("note"), // optional (supplier / invoice / remark)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One line per variant received in an arrivage. `quantity` is an immutable
// snapshot of how many pairs of that variant arrived in THIS shipment, so the
// history stays accurate even as live shoeInventory.quantity changes later.
export const arrivalItems = pgTable("arrival_items", {
  id: uuid().primaryKey().defaultRandom(),
  arrivalId: uuid("arrival_id")
    .notNull()
    .references(() => arrivals.id, { onDelete: "cascade" }),
  shoeInventoryId: uuid("shoe_inventory_id")
    .notNull()
    .references(() => shoeInventory.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
