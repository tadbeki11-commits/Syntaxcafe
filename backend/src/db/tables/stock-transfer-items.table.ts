import {
  pgTable,
  uuid,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory-items.table";
import { stockTransfers } from "./stock-transfers.table";
import { tenantColumns } from "./_tenant";

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  transfer_id: uuid("transfer_id")
    .notNull()
    .references(() => stockTransfers.id, { onDelete: "cascade" }),
  inventory_item_id: uuid("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  meta: jsonb("meta").default({}),
  created_at: timestamp("created_at").defaultNow(),
});
