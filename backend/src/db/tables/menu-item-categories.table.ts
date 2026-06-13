import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { categories } from "./categories.table";
import { menuItems } from "./menu-items.table";
import { tenantColumns } from "./_tenant";

export const menuItemCategories = pgTable(
  "menu_item_categories",
  {
    ...tenantColumns(),
    menu_item_id: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    category_id: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.menu_item_id, table.category_id] }),
    categoryItemIdx: index("menu_item_categories_category_item_idx").on(
      table.category_id,
      table.menu_item_id,
    ),
    itemCategoryIdx: index("menu_item_categories_item_category_idx").on(
      table.menu_item_id,
      table.category_id,
    ),
  }),
);
