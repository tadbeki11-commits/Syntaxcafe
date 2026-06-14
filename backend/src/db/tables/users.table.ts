import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses.table";
import { branches } from "./branches.table";

export const users = pgTable(
  "users",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable: platform super admins have no owning business; all other users do.
  business_id: uuid("business_id").references(() => businesses.id, {
    onDelete: "set null",
  }),
  // The branch a user belongs to. NULL only for cross-branch accounts: platform
  // super admins and business owners. All in-cafe staff (admin/cashier/
  // kitchen_staff/cafe_waiter) are pinned to exactly one branch.
  branch_id: uuid("branch_id").references(() => branches.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 200 }).notNull(),
  username: varchar("username", { length: 200 }),
  password_hash: text("password_hash"),
  pin_hash: text("pin_hash"),
  role: varchar("role", { length: 32 }).notNull(),
  role_id: uuid("role_id"),
  first_name: varchar("first_name", { length: 200 }),
  last_name: varchar("last_name", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  is_active: boolean("is_active").default(true),
  cancel_password: text("cancel_password"),
  print_copies: varchar("print_copies", { length: 8 }).default("1"),
  meta: jsonb("meta").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Staff usernames are unique within their branch.
    branchUsernameIdx: uniqueIndex("users_branch_username_idx")
      .on(table.branch_id, table.username)
      .where(sql`${table.branch_id} IS NOT NULL`),
    // Cross-branch accounts (owners; super_admins have NULL business_id, which
    // Postgres treats as distinct) are unique within their business.
    businessUsernameIdx: uniqueIndex("users_business_username_idx")
      .on(table.business_id, table.username)
      .where(sql`${table.branch_id} IS NULL`),
  }),
);
