import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { orders } from "./orders.table";
import { users } from "./users.table";
import { tenantColumns } from "./_tenant";

export const orderStatusLogs = pgTable("order_status_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  order_id: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull(),
  changed_by: uuid("changed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  changed_at: timestamp("changed_at").defaultNow(),
});
