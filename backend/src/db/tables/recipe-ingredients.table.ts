import {
  pgTable,
  uuid,
  integer,
  numeric,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { recipes } from "./recipes.table";
import { inventoryItems } from "./inventory-items.table";
import { tenantColumns } from "./_tenant";

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  recipe_id: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  inventory_item_id: uuid("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(), // Smallest units (e.g. ml, g, piece) as integer
  waste_factor: numeric("waste_factor", { precision: 5, scale: 3 })
    .default("1.000")
    .notNull(),
  is_optional: boolean("is_optional").default(false).notNull(),
  notes: text("notes"),
  display_order: integer("display_order").default(0).notNull(),
});
