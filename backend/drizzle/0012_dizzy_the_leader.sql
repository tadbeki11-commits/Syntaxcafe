CREATE TABLE "sync_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" integer,
	"entity_local_id" varchar(120),
	"operation" varchar(20) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dining_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_number" integer NOT NULL,
	"status" varchar(50) DEFAULT 'available' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "min_quantity_mode" varchar(20) DEFAULT 'global';--> statement-breakpoint
ALTER TABLE "stock_locations" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_locations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "sync_events_cursor_idx" ON "sync_events" USING btree ("id");--> statement-breakpoint
CREATE INDEX "sync_events_entity_idx" ON "sync_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "dining_tables_table_number_idx" ON "dining_tables" USING btree ("table_number");--> statement-breakpoint
CREATE INDEX "dining_tables_status_idx" ON "dining_tables" USING btree ("status");