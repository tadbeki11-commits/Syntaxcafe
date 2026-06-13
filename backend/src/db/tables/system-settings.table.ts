import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

// Settings are per-branch (each branch is an independent POS), so the primary key
// is composite on (branch_id, key) rather than key alone.
export const systemSettings = pgTable(
  "system_settings",
  {
    ...tenantColumns(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.branch_id, table.key] }),
  }),
);
