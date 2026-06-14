import {
  pgTable,
  uuid,
  integer,
  text,
  varchar,
  timestamp,
  json,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users.table";
import { organizations } from "./organizations.table";
import { tenantColumns } from "./_tenant";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  // Human-friendly, ever-increasing serial scoped to the branch. Assigned on
  // create/sync from order_counters. Nullable for legacy rows created before
  // this column existed.
  order_number: integer("order_number"),
  customer_id: text("customer_id"),
  organization_id: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  is_price_override: boolean("is_price_override").default(false).notNull(),
  employee_id: uuid("employee_id").references(() => users.id, {
    onDelete: "set null",
  }),
  table_number: integer("table_number"),
  waiter_id: uuid("waiter_id").references(() => users.id, {
    onDelete: "set null",
  }),
  cashier_id: uuid("cashier_id").references(() => users.id, {
    onDelete: "set null",
  }),
  type: varchar("type", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull(),
  payment_status: varchar("payment_status", { length: 50 }),
  total_amount: integer("total_amount"),
  total_cents: integer("total_cents").default(0),
  notes: text("notes"),
  meta: json("meta"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
