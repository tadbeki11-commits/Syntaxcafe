import {
  pgTable,
  uuid,
  integer,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }),
    category: varchar("category", { length: 100 }),
    main_category: varchar("main_category", { length: 100 }),
    type: varchar("type", { length: 50 }),
    is_available: boolean("is_available").default(true),
    image_url: text("image_url"),
    prep_time_minutes: integer("prep_time_minutes").default(0),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    meta: jsonb("meta").default({}),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    availableIdx: index("menu_items_available_idx").on(table.is_available),
    nameIdx: index("menu_items_name_idx").on(table.name),
    skuIdx: index("menu_items_sku_idx").on(table.sku),
    barcodeIdx: index("menu_items_barcode_idx").on(table.barcode),
  }),
);
