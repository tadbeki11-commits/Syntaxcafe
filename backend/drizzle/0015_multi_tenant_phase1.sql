-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-tenant Phase 1: businesses + branches, row-level business_id/branch_id.
--
-- Hand-authored from the drizzle-kit reference so the column adds are DATA-SAFE:
--   add nullable  ->  seed default business/branch  ->  backfill  ->  set NOT NULL.
-- Deliberately does NOT drop the legacy `menus` table or `sync_events.entity_local_id`
-- (pre-existing drift, out of scope here), and skips drizzle's no-op type casts.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New tenant tables -------------------------------------------------------
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"owner_user_id" uuid,
	"plan" varchar(50) DEFAULT 'standard' NOT NULL,
	"max_branches" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"parent_branch_id" uuid,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"timezone" varchar(64) DEFAULT 'Africa/Addis_Ababa',
	"currency" varchar(8) DEFAULT 'ETB',
	"address" text,
	"phone" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_parent_branch_id_branches_id_fk" FOREIGN KEY ("parent_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_idx" ON "businesses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "businesses_active_name_idx" ON "businesses" USING btree ("is_active","name");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_business_slug_idx" ON "branches" USING btree ("business_id","slug");--> statement-breakpoint
CREATE INDEX "branches_business_active_idx" ON "branches" USING btree ("business_id","is_active");--> statement-breakpoint

-- 2. Seed a default business + branch so existing single-cafe data can be backfilled.
INSERT INTO "businesses" ("id","name","slug")
VALUES ('00000000-0000-0000-0000-000000000001','Default Business','default-business')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "branches" ("id","business_id","name","slug")
VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Main Branch','main-branch')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- 3. Add business_id + branch_id to every operational table (nullable), backfill to
--    the default tenant, set NOT NULL, then add the FKs. Done in one loop so the
--    ordering is guaranteed safe for tables that already contain rows.
DO $$
DECLARE
	t text;
	biz constant uuid := '00000000-0000-0000-0000-000000000001';
	br  constant uuid := '00000000-0000-0000-0000-000000000002';
	both_tables text[] := ARRAY[
		'payment_methods','menu_items','main_categories','categories',
		'menu_item_categories','orders','order_items','order_status_logs',
		'payments','inventory_items','stock_movements','stock_transfers',
		'stock_transfer_items','stock_locations','inventory_stock','recipes',
		'recipe_ingredients','system_settings','dining_tables','organizations',
		'org_credit_payments','org_credit_transactions'
	];
BEGIN
	FOREACH t IN ARRAY both_tables LOOP
		EXECUTE format('ALTER TABLE %I ADD COLUMN "business_id" uuid', t);
		EXECUTE format('ALTER TABLE %I ADD COLUMN "branch_id" uuid', t);
		EXECUTE format('UPDATE %I SET "business_id"=%L, "branch_id"=%L WHERE "business_id" IS NULL', t, biz, br);
		EXECUTE format('ALTER TABLE %I ALTER COLUMN "business_id" SET NOT NULL', t);
		EXECUTE format('ALTER TABLE %I ALTER COLUMN "branch_id" SET NOT NULL', t);
		EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action', t, t || '_business_id_businesses_id_fk');
		EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action', t, t || '_branch_id_branches_id_fk');
	END LOOP;
END $$;--> statement-breakpoint

-- 4. users gets business_id only (nullable: platform super admins have no business),
--    backfilled to the default business for existing staff.
ALTER TABLE "users" ADD COLUMN "business_id" uuid;--> statement-breakpoint
UPDATE "users" SET "business_id"='00000000-0000-0000-0000-000000000001' WHERE "business_id" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- 5. system_settings becomes per-branch: swap the single-column PK for (branch_id, key).
ALTER TABLE "system_settings" DROP CONSTRAINT IF EXISTS "system_settings_pkey";--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_branch_id_key_pk" PRIMARY KEY("branch_id","key");--> statement-breakpoint

-- 6. Make uniqueness per-branch (slugs, recipe-per-item, stock-per-location, names).
ALTER TABLE "payment_methods" DROP CONSTRAINT IF EXISTS "payment_methods_name_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "main_categories_slug_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "categories_slug_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "stock_locations_slug_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "inventory_stock_item_location_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "recipes_menu_item_active_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "users_business_username_idx" ON "users" USING btree ("business_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_branch_name_idx" ON "payment_methods" USING btree ("branch_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "main_categories_slug_idx" ON "main_categories" USING btree ("branch_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("branch_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_locations_slug_idx" ON "stock_locations" USING btree ("branch_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_stock_item_location_idx" ON "inventory_stock" USING btree ("branch_id","inventory_item_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_menu_item_active_idx" ON "recipes" USING btree ("branch_id","menu_item_id");
