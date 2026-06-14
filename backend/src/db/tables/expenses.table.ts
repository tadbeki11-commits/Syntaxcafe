import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

// Operating expenses of the house (rent, utilities, salaries, supplies, …).
// Branch-scoped like every other operational table. Used together with paid
// order revenue to compute profit (revenue − expenses) per day/month.
//
// Monetary convention (see CLAUDE.md): `amount` is whole birr and
// `amount_cents` is the sub-unit; both are stored together.
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description"),
    amount: integer("amount").notNull(),
    amount_cents: integer("amount_cents").default(0).notNull(),
    payment_method: varchar("payment_method", { length: 50 }),
    expense_date: timestamp("expense_date").defaultNow().notNull(),
    recorded_by: uuid("recorded_by"),
    recorded_by_name: varchar("recorded_by_name", { length: 120 }),
    version: integer("version").default(1).notNull(),
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    branchDateIdx: index("expenses_branch_date_idx").on(
      table.branch_id,
      table.expense_date,
    ),
    branchCategoryIdx: index("expenses_branch_category_idx").on(
      table.branch_id,
      table.category,
    ),
  }),
);
