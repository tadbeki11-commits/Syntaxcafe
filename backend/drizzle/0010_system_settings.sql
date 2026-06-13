CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

INSERT INTO "system_settings" ("key", "value")
VALUES ('allow_low_stock_orders', 'false')
ON CONFLICT DO NOTHING;
