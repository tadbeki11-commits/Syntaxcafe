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
} from "drizzle-orm/pg-core";

// A Business is an owner/company that signs up to the platform. It owns branches
// and staff and is the umbrella for cross-branch reporting. It is NOT the same as
// `organizations` (which are B2B credit customers).
export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    // Logical owner (a user with role `owner`). No DB-level FK to avoid a circular
    // dependency with users (which carries business_id).
    owner_user_id: uuid("owner_user_id"),
    plan: varchar("plan", { length: 50 }).default("standard").notNull(),
    // Max branches the plan allows; null = unlimited. Enforced at the platform tier.
    max_branches: integer("max_branches"),
    is_active: boolean("is_active").default(true).notNull(),
    meta: jsonb("meta").default({}),
    version: integer("version").default(1).notNull(),
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("businesses_slug_idx").on(table.slug),
    activeNameIdx: index("businesses_active_name_idx").on(
      table.is_active,
      table.name,
    ),
  }),
);
