CREATE TABLE "org_credit_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "org_credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"payment_id" integer,
	"transaction_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inventory_stock" ALTER COLUMN "min_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "credit_balance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_credit_payments" ADD CONSTRAINT "org_credit_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_credit_transactions" ADD CONSTRAINT "org_credit_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_credit_transactions" ADD CONSTRAINT "org_credit_transactions_payment_id_org_credit_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."org_credit_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_credit_payments_org_idx" ON "org_credit_payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_credit_txn_org_idx" ON "org_credit_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_credit_txn_payment_idx" ON "org_credit_transactions" USING btree ("payment_id");