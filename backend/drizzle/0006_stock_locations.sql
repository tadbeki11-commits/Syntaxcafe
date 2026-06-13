CREATE TABLE IF NOT EXISTS "stock_locations" (
  "id" serial PRIMARY KEY,
  "name" varchar(120) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "description" text,
  "location_type" varchar(50) DEFAULT 'storage' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "linked_main_category_slug" varchar(120),
  "meta" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_locations_slug_idx" ON "stock_locations" ("slug");
CREATE INDEX IF NOT EXISTS "stock_locations_active_order_idx" ON "stock_locations" ("is_active", "display_order", "name");

INSERT INTO "stock_locations" ("name", "slug", "description", "location_type", "is_default", "is_active", "display_order")
VALUES
  ('Main Store', 'main-store', 'Primary storage for inventory', 'storage', true, true, 0),
  ('Barista Station', 'barista-station', 'Front barista prep station', 'prep_station', false, true, 1)
ON CONFLICT ("slug") DO NOTHING;
