import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses.table";

// A Branch is one physical cafe: one desktop install + one local SQLite DB.
// It is the real tenant boundary for operational data (menu, orders, inventory...).
// `parent_branch_id` models "a cafe that is a branch of another cafe".
export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    business_id: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    parent_branch_id: uuid("parent_branch_id").references(
      (): AnyPgColumn => branches.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    timezone: varchar("timezone", { length: 64 }).default("Africa/Addis_Ababa"),
    currency: varchar("currency", { length: 8 }).default("ETB"),
    address: text("address"),
    phone: varchar("phone", { length: 50 }),
    is_active: boolean("is_active").default(true).notNull(),
    meta: jsonb("meta").default({}),
    version: integer("version").default(1).notNull(),
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    businessSlugIdx: uniqueIndex("branches_business_slug_idx").on(
      table.business_id,
      table.slug,
    ),
    businessActiveIdx: index("branches_business_active_idx").on(
      table.business_id,
      table.is_active,
    ),
  }),
);
