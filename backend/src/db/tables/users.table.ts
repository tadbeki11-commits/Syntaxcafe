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

export const users = pgTable(
  "users",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable: platform super admins have no owning business; all other users do.
  business_id: uuid("business_id").references(() => businesses.id, {
    onDelete: "set null",
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
    businessUsernameIdx: uniqueIndex("users_business_username_idx").on(
      table.business_id,
      table.username,
    ),
  }),
);
