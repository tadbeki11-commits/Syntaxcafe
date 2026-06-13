import { pgTable, uuid, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory-items.table";
import { stockLocations } from "./stock-locations.table";
import { tenantColumns } from "./_tenant";

export const inventoryStock = pgTable(
  "inventory_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    inventory_item_id: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    location_id: uuid("location_id")
      .notNull()
      .references(() => stockLocations.id, { onDelete: "restrict" }),
    quantity: integer("quantity").default(0).notNull(),
    min_quantity: integer("min_quantity").default(0),
  },
  (table) => ({
    itemLocationIdx: uniqueIndex("inventory_stock_item_location_idx").on(
      table.branch_id,
      table.inventory_item_id,
      table.location_id,
    ),
  }),
);
