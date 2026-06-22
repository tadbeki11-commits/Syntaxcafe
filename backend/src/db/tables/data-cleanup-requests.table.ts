import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses.table";
import { branches } from "./branches.table";
import { branchDevices } from "./branch-devices.table";

// A desktop device's request to wipe its local data. The device creates a
// `pending` request; an owner approves/rejects it from the web Devices page;
// once `approved` the device runs the branch cleanup + clears its local tables
// and marks the request `completed`. Scoped to a single device so other devices
// in the same branch don't wipe on one approval.
export const dataCleanupRequests = pgTable(
  "data_cleanup_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    business_id: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    branch_id: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    // The requesting device. Nullable so the request survives device removal.
    device_id: uuid("device_id").references(() => branchDevices.id, {
      onDelete: "set null",
    }),
    device_name: varchar("device_name", { length: 200 }),
    // pending | approved | rejected | completed
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    reason: varchar("reason", { length: 500 }),
    requested_at: timestamp("requested_at").defaultNow(),
    reviewed_at: timestamp("reviewed_at"),
    reviewed_by_user_id: uuid("reviewed_by_user_id"),
    completed_at: timestamp("completed_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    branchStatusIdx: index("data_cleanup_requests_branch_status_idx").on(
      table.branch_id,
      table.status,
    ),
    deviceIdx: index("data_cleanup_requests_device_idx").on(table.device_id),
  }),
);
