import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// An append-only record of platform super-admin actions (create/suspend/delete
// businesses, add/remove branches, etc.). Unscoped by design — only the platform
// tier writes and reads it. `business_id` is the affected business, kept for
// filtering; the actor is denormalised so entries survive the user being deleted.
export const platformAuditLogs = pgTable(
  "platform_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor_user_id: uuid("actor_user_id"),
    actor_username: varchar("actor_username", { length: 200 }),
    // e.g. "business.create", "business.suspend", "branch.delete"
    action: varchar("action", { length: 64 }).notNull(),
    target_type: varchar("target_type", { length: 32 }),
    target_id: uuid("target_id"),
    target_label: varchar("target_label", { length: 200 }),
    business_id: uuid("business_id"),
    metadata: jsonb("metadata").default({}),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    createdIdx: index("platform_audit_created_idx").on(table.created_at),
    businessIdx: index("platform_audit_business_idx").on(table.business_id),
  }),
);
