import {
  pgTable,
  uuid,
  integer,
  text,
  varchar,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    icon: varchar("icon", { length: 100 }),
    display_order: integer("display_order").default(0).notNull(),
    type: varchar("type", { length: 50 }).default("main").notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    meta: text("meta"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(table.branch_id, table.slug),
    typeActiveOrderIdx: index("categories_type_active_order_idx").on(
      table.type,
      table.is_active,
      table.display_order,
    ),
  }),
);
