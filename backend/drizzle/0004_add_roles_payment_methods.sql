-- Migration 4: Add roles, payment_methods tables and user columns

-- 1. roles table
CREATE TABLE IF NOT EXISTS "roles" (
  "id" serial PRIMARY KEY,
  "name" varchar(64) NOT NULL UNIQUE,
  "display_name" varchar(128) NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 2. payment_methods table
CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" serial PRIMARY KEY,
  "name" varchar(64) NOT NULL UNIQUE,
  "display_name" varchar(128) NOT NULL,
  "icon" varchar(64),
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payment_methods_active_idx" ON "payment_methods" ("is_active");

-- 3. payment_method_settings (for future per-method config per user/branch)
CREATE TABLE IF NOT EXISTS "payment_method_settings" (
  "id" serial PRIMARY KEY,
  "payment_method_id" integer NOT NULL,
  "method_key" varchar(64) NOT NULL,
  "method_value" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "users" ADD COLUMN "role_id" varchar(32);
ALTER TABLE "users" ADD COLUMN "cancel_password" text;
ALTER TABLE "users" ADD COLUMN "print_copies" varchar(8) DEFAULT '1';


