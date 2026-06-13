CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"icon" varchar(100),
	"display_order" integer DEFAULT 0 NOT NULL,
	"type" varchar(50) DEFAULT 'main' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"meta" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_categories" (
	"menu_item_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "menu_item_categories_menu_item_id_category_id_pk" PRIMARY KEY("menu_item_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"unit" varchar(50) DEFAULT 'piece',
	"base_unit" varchar(50) DEFAULT 'piece',
	"pieces_per_unit" integer DEFAULT 1,
	"store_quantity" integer DEFAULT 0,
	"barista_quantity" integer DEFAULT 0,
	"min_quantity" integer DEFAULT 0,
	"menu_item_ids" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_item_id" integer,
	"movement_type" varchar(50) NOT NULL,
	"location" varchar(50),
	"quantity_delta" integer NOT NULL,
	"quantity_after" integer,
	"transfer_id" integer,
	"notes" text,
	"created_by" integer,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_location" varchar(50) NOT NULL,
	"to_location" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"notes" text,
	"created_by" integer,
	"received_by" integer,
	"received_at" timestamp,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "meta" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "prep_time_minutes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "sku" varchar(100);--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "barcode" varchar(100);--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "meta" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "menu_item_categories" ADD CONSTRAINT "menu_item_categories_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_categories" ADD CONSTRAINT "menu_item_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_type_active_order_idx" ON "categories" USING btree ("type","is_active","display_order");--> statement-breakpoint
CREATE INDEX "menu_item_categories_category_item_idx" ON "menu_item_categories" USING btree ("category_id","menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_item_categories_item_category_idx" ON "menu_item_categories" USING btree ("menu_item_id","category_id");--> statement-breakpoint
CREATE INDEX "menu_items_available_idx" ON "menu_items" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "menu_items_name_idx" ON "menu_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "menu_items_sku_idx" ON "menu_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "menu_items_barcode_idx" ON "menu_items" USING btree ("barcode");