import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

export const stockLocations = pgTable(
  "stock_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
    location_type: varchar("location_type", { length: 50 }).default("storage").notNull(),
    is_default: boolean("is_default").default(false).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    display_order: integer("display_order").default(0).notNull(),
    linked_main_category_slug: varchar("linked_main_category_slug", { length: 120 }),
    meta: jsonb("meta").default({}),
    version: integer("version").default(1).notNull(),
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("stock_locations_slug_idx").on(
      table.branch_id,
      table.slug,
    ),
    activeOrderIdx: index("stock_locations_active_order_idx").on(
      table.is_active,
      table.display_order,
      table.name,
    ),
  }),
);
