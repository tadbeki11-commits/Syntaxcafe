import {
  pgTable,
  uuid,
  integer,
  text,
  varchar,
  timestamp,
  json,
} from "drizzle-orm/pg-core";
import { orders } from "./orders.table";
import { users } from "./users.table";
import { tenantColumns } from "./_tenant";

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  order_id: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount_cents: integer("amount_cents"),
  amount: integer("amount"),
  method: varchar("method", { length: 50 }),
  payment_method: varchar("payment_method", { length: 50 }),
  status: varchar("status", { length: 50 }),
  processed_by: uuid("processed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  qr_code: text("qr_code"),
  paid_at: timestamp("paid_at"),
  meta: json("meta"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
