import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu-items.table";
import { stockLocations } from "./stock-locations.table";
import { tenantColumns } from "./_tenant";

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    menu_item_id: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    yield_quantity: integer("yield_quantity").default(1).notNull(),
    deduct_from_location_id: uuid("deduct_from_location_id").references(
      () => stockLocations.id,
      { onDelete: "set null" }
    ),
    deduct_strategy: varchar("deduct_strategy", { length: 50 })
      .default("by_menu_category")
      .notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    meta: jsonb("meta").default({}),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    menuItemActiveIdx: uniqueIndex("recipes_menu_item_active_idx").on(
      table.branch_id,
      table.menu_item_id
    ),
  })
);
