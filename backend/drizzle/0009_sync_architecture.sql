CREATE TABLE IF NOT EXISTS "sync_events" (
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
CREATE INDEX IF NOT EXISTS "sync_events_cursor_idx" ON "sync_events" USING btree ("id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_events_entity_idx" ON "sync_events" USING btree ("entity_type","entity_id");
--> statement-breakpoint
ALTER TABLE "stock_locations" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_locations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
