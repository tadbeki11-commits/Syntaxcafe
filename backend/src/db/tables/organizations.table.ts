import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenantColumns } from "./_tenant";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...tenantColumns(),
    name: varchar("name", { length: 200 }).notNull(),
    contact_name: varchar("contact_name", { length: 200 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 200 }),
    address: text("address"),
    notes: text("notes"),
    is_active: boolean("is_active").default(true).notNull(),
    credit_balance: numeric("credit_balance", { precision: 12, scale: 2 }).default("0").notNull(),
    meta: jsonb("meta").default({}),
    version: integer("version").default(1).notNull(),
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    activeNameIdx: index("organizations_active_name_idx").on(
      table.is_active,
      table.name,
    ),
  }),
);
