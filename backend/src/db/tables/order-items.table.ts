import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu-items.table";
import { orders } from "./orders.table";
import { tenantColumns } from "./_tenant";

export const order_items = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  order_id: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menu_item_id: uuid("menu_item_id").references(() => menuItems.id, {
    onDelete: "set null",
  }),
  menu_id: uuid("menu_id").references(() => menuItems.id, {
    onDelete: "set null",
  }),
  quantity: integer("quantity").notNull().default(1),
  unit_price: integer("unit_price"),
  unit_price_cents: integer("unit_price_cents"),
  subtotal: integer("subtotal"),
  item_type: varchar("item_type", { length: 50 }),
  main_category: varchar("main_category", { length: 50 }),
  note: varchar("note", { length: 300 }),
  created_at: timestamp("created_at").defaultNow(),
});
