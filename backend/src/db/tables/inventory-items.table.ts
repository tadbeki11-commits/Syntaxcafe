import {
  pgTable,
  uuid,
  integer,
  text,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  name: varchar("name", { length: 200 }).notNull(),
  unit: varchar("unit", { length: 50 }).default("piece"),
  base_unit: varchar("base_unit", { length: 50 }).default("piece"),
  pieces_per_unit: integer("pieces_per_unit").default(1),
  min_quantity: integer("min_quantity").default(0),
  min_quantity_mode: varchar("min_quantity_mode", { length: 20 }).default("global"),
  notes: text("notes"),
  meta: jsonb("meta").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
