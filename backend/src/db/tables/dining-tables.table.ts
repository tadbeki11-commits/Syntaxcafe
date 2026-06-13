import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

export const diningTables = pgTable(
  "dining_tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    table_number: integer("table_number").notNull(),
    status: varchar("status", { length: 50 }).default("available").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    tableNumberIdx: index("dining_tables_table_number_idx").on(table.table_number),
    statusIdx: index("dining_tables_status_idx").on(table.status),
  }),
);
