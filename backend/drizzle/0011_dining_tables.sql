CREATE TABLE IF NOT EXISTS "dining_tables" (
  "id" serial PRIMARY KEY NOT NULL,
  "table_number" integer NOT NULL,
  "status" varchar(50) DEFAULT 'available' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dining_tables_table_number_idx" ON "dining_tables" ("table_number");
CREATE INDEX IF NOT EXISTS "dining_tables_status_idx" ON "dining_tables" ("status");
