import {
  pgTable,
  uuid,
  numeric,
  text,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.table";
import { tenantColumns } from "./_tenant";

/** Records credit top-ups made to an organization's account. */
export const org_credit_payments = pgTable(
  "org_credit_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    payment_date: timestamp("payment_date").defaultNow().notNull(),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("org_credit_payments_org_idx").on(table.organization_id),
  }),
);
