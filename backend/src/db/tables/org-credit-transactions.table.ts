import {
  pgTable,
  uuid,
  numeric,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.table";
import { org_credit_payments } from "./org-credit-payments.table";
import { tenantColumns } from "./_tenant";

/**
 * Records service-usage deductions from an organization's credit balance.
 * `services` is a JSON array of { description: string; cost: number } objects.
 */
export const org_credit_transactions = pgTable(
  "org_credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Optional: link this transaction to a specific payment top-up */
    payment_id: uuid("payment_id").references(() => org_credit_payments.id, {
      onDelete: "set null",
    }),
    transaction_date: timestamp("transaction_date").defaultNow().notNull(),
    notes: text("notes"),
    /**
     * Array of services consumed: [{ description: string, cost: number }, ...]
     */
    services: jsonb("services").default([]).notNull(),
    total_amount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("org_credit_txn_org_idx").on(table.organization_id),
    paymentIdx: index("org_credit_txn_payment_idx").on(table.payment_id),
  }),
);
