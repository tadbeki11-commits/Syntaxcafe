CREATE TABLE IF NOT EXISTS "main_categories" (
  "id" serial PRIMARY KEY,
  "name" varchar(120) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "main_categories_slug_idx" ON "main_categories" ("slug");
CREATE INDEX IF NOT EXISTS "main_categories_active_order_idx" ON "main_categories" ("is_active", "display_order", "name");

INSERT INTO "main_categories" ("name", "slug", "display_order", "is_active")
SELECT DISTINCT
  initcap(replace(trim(mi."main_category"), '_', ' ')) as name,
  lower(regexp_replace(trim(mi."main_category"), '[^a-zA-Z0-9]+', '-', 'g')) as slug,
  0,
  true
FROM "menu_items" mi
WHERE mi."main_category" IS NOT NULL
  AND trim(mi."main_category") <> ''
ON CONFLICT ("slug") DO NOTHING;
