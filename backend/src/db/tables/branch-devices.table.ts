import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses.table";
import { branches } from "./branches.table";

// A device (one desktop install) pinned to a branch. Enrollment is two-step:
//   1. owner/platform mints a one-time enrollment code (code_hash + expiry)
//   2. the device redeems the code for a long-lived token (token_hash)
// All sync/API calls then send the token, from which the server derives the tenant.
export const branchDevices = pgTable(
  "branch_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    business_id: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    branch_id: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }),
    // sha256 of the long-lived device token (null until the code is redeemed)
    token_hash: varchar("token_hash", { length: 64 }),
    // sha256 of the one-time enrollment code (cleared once redeemed)
    code_hash: varchar("code_hash", { length: 64 }),
    code_expires_at: timestamp("code_expires_at"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    last_seen_at: timestamp("last_seen_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("branch_devices_token_idx").on(table.token_hash),
    codeIdx: index("branch_devices_code_idx").on(table.code_hash),
    branchIdx: index("branch_devices_branch_idx").on(table.branch_id),
  }),
);
