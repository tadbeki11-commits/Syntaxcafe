ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "prep_time_minutes" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "sku" varchar(100);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "barcode" varchar(100);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "meta" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
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
CREATE TABLE IF NOT EXISTS "menu_item_categories" (
	"menu_item_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "menu_item_categories_menu_item_id_category_id_pk" PRIMARY KEY("menu_item_id","category_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_type_active_order_idx" ON "categories" USING btree ("type","is_active","display_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menu_items_available_idx" ON "menu_items" USING btree ("is_available");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menu_items_name_idx" ON "menu_items" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menu_items_sku_idx" ON "menu_items" USING btree ("sku");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menu_items_barcode_idx" ON "menu_items" USING btree ("barcode");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menu_item_categories_category_item_idx" ON "menu_item_categories" USING btree ("category_id","menu_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menu_item_categories_item_category_idx" ON "menu_item_categories" USING btree ("menu_item_id","category_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_item_categories" ADD CONSTRAINT "menu_item_categories_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_item_categories" ADD CONSTRAINT "menu_item_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
