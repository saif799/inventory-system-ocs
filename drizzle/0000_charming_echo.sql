CREATE TABLE "image_notifier_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoe_inventory_id" uuid NOT NULL,
	"order_id" varchar,
	"direction" varchar DEFAULT 'remove' NOT NULL,
	"created_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lended_shoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoe_inventory_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arrival_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arrival_id" uuid NOT NULL,
	"shoe_inventory_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arrivals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar,
	"note" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrower" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dhd_communes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wilaya_id" integer NOT NULL,
	"nom" varchar NOT NULL,
	"has_stop_desk" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp with time zone,
	CONSTRAINT "dhd_communes_wilaya_nom_unique" UNIQUE("wilaya_id","nom")
);
--> statement-breakpoint
CREATE TABLE "dhd_tarifs" (
	"wilaya_id" integer PRIMARY KEY NOT NULL,
	"tarif_livraison" varchar DEFAULT '0' NOT NULL,
	"tarif_stopdesk_livraison" varchar DEFAULT '0' NOT NULL,
	"tarif_echange" varchar DEFAULT '0' NOT NULL,
	"tarif_stopdesk_echange" varchar DEFAULT '0' NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dhd_wilayas" (
	"wilaya_id" integer PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"shoe_inventory_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY NOT NULL,
	"reference" varchar,
	"nom_client" varchar NOT NULL,
	"telephone" varchar NOT NULL,
	"telephone_2" varchar,
	"adresse" varchar NOT NULL,
	"commune" varchar NOT NULL,
	"code_wilaya" varchar NOT NULL,
	"montant" varchar NOT NULL,
	"remarque" varchar,
	"type" integer NOT NULL,
	"source" varchar DEFAULT 'i' NOT NULL,
	"provider" varchar DEFAULT 'dhd' NOT NULL,
	"borrower_id" uuid,
	"stop_desk" integer NOT NULL,
	"status" varchar DEFAULT 'prete_a_expedier' NOT NULL,
	"status_id" uuid DEFAULT '404332b3-998f-498f-a325-3e4ecf6c3bbb' NOT NULL,
	"saif_paid" boolean DEFAULT false NOT NULL,
	"created_at" date DEFAULT now() NOT NULL,
	"updated_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoe_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoe_id" varchar NOT NULL,
	"cloudflare_image_id" varchar NOT NULL,
	"url" varchar NOT NULL,
	"alt_text" varchar,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoe_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoe_id" varchar NOT NULL,
	"size" varchar NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"price_override" integer,
	"created_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoe_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoes" (
	"id" varchar PRIMARY KEY NOT NULL,
	"model_id" uuid NOT NULL,
	"color" varchar NOT NULL,
	"hex_code" varchar DEFAULT '#FFFFFF' NOT NULL,
	"base_price" integer DEFAULT 0 NOT NULL,
	"compare_at_price" integer
);
--> statement-breakpoint
CREATE TABLE "status_groups_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status_name" varchar NOT NULL,
	"external_statuses" varchar[] DEFAULT ARRAY[]::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoe_inventory_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yalidine_communes" (
	"commune_id" integer PRIMARY KEY NOT NULL,
	"wilaya_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"wilaya_name" varchar NOT NULL,
	"has_stop_desk" integer DEFAULT 0 NOT NULL,
	"is_deliverable" integer DEFAULT 1 NOT NULL,
	"express_desk" integer,
	"stopdesk_id" integer,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "yalidine_wilayas" (
	"wilaya_id" integer PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "image_notifier_table" ADD CONSTRAINT "image_notifier_table_shoe_inventory_id_shoe_inventory_id_fk" FOREIGN KEY ("shoe_inventory_id") REFERENCES "public"."shoe_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_notifier_table" ADD CONSTRAINT "image_notifier_table_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lended_shoes" ADD CONSTRAINT "lended_shoes_shoe_inventory_id_shoe_inventory_id_fk" FOREIGN KEY ("shoe_inventory_id") REFERENCES "public"."shoe_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lended_shoes" ADD CONSTRAINT "lended_shoes_borrower_id_borrower_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrower"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arrival_items" ADD CONSTRAINT "arrival_items_arrival_id_arrivals_id_fk" FOREIGN KEY ("arrival_id") REFERENCES "public"."arrivals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arrival_items" ADD CONSTRAINT "arrival_items_shoe_inventory_id_shoe_inventory_id_fk" FOREIGN KEY ("shoe_inventory_id") REFERENCES "public"."shoe_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dhd_communes" ADD CONSTRAINT "dhd_communes_wilaya_id_dhd_wilayas_wilaya_id_fk" FOREIGN KEY ("wilaya_id") REFERENCES "public"."dhd_wilayas"("wilaya_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dhd_tarifs" ADD CONSTRAINT "dhd_tarifs_wilaya_id_dhd_wilayas_wilaya_id_fk" FOREIGN KEY ("wilaya_id") REFERENCES "public"."dhd_wilayas"("wilaya_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shoe_inventory_id_shoe_inventory_id_fk" FOREIGN KEY ("shoe_inventory_id") REFERENCES "public"."shoe_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_borrower_id_borrower_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrower"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_id_status_groups_table_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status_groups_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoe_images" ADD CONSTRAINT "shoe_images_shoe_id_shoes_id_fk" FOREIGN KEY ("shoe_id") REFERENCES "public"."shoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoe_inventory" ADD CONSTRAINT "shoe_inventory_shoe_id_shoes_id_fk" FOREIGN KEY ("shoe_id") REFERENCES "public"."shoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoes" ADD CONSTRAINT "shoes_model_id_shoe_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."shoe_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_sales" ADD CONSTRAINT "store_sales_shoe_inventory_id_shoe_inventory_id_fk" FOREIGN KEY ("shoe_inventory_id") REFERENCES "public"."shoe_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yalidine_communes" ADD CONSTRAINT "yalidine_communes_wilaya_id_yalidine_wilayas_wilaya_id_fk" FOREIGN KEY ("wilaya_id") REFERENCES "public"."yalidine_wilayas"("wilaya_id") ON DELETE cascade ON UPDATE no action;