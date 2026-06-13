CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"contact_name" varchar(200),
	"phone" varchar(50),
	"email" varchar(200),
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_price_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "organizations_active_name_idx" ON "organizations" USING btree ("is_active","name");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;