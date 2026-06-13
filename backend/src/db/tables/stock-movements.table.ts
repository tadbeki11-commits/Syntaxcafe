import {
  pgTable,
  uuid,
  integer,
  text,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory-items.table";
import { users } from "./users.table";
import { stockLocations } from "./stock-locations.table";
import { orders } from "./orders.table";
import { order_items } from "./order-items.table";
import { tenantColumns } from "./_tenant";

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  inventory_item_id: uuid("inventory_item_id").references(
    () => inventoryItems.id,
    { onDelete: "cascade" },
  ),
  movement_type: varchar("movement_type", { length: 50 }).notNull(),
  location: varchar("location", { length: 50 }), // legacy field
  location_id: uuid("location_id").references(() => stockLocations.id, {
    onDelete: "restrict",
  }),
  quantity_delta: integer("quantity_delta").notNull(),
  quantity_after: integer("quantity_after"),
  transfer_id: uuid("transfer_id"),
  order_id: uuid("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  order_item_id: uuid("order_item_id").references(() => order_items.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  meta: jsonb("meta").default({}),
  created_at: timestamp("created_at").defaultNow(),
});
