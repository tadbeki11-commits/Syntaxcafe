import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

export const mainCategories = pgTable(
  "main_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    display_order: integer("display_order").default(0).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("main_categories_slug_idx").on(
      table.branch_id,
      table.slug,
    ),
    activeOrderIdx: index("main_categories_active_order_idx").on(
      table.is_active,
      table.display_order,
      table.name,
    ),
  }),
);
