import {
  pgTable,
  bigserial,
  varchar,
  uuid,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const syncEvents = pgTable(
  "sync_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    event_type: varchar("event_type", { length: 120 }).notNull(),
    entity_type: varchar("entity_type", { length: 80 }).notNull(),
    entity_id: uuid("entity_id"),
    operation: varchar("operation", { length: 20 }).notNull(),
    // Tenant partitioning: branch_id NULL = a business-wide broadcast event.
    // No FKs here to keep this high-volume append log light.
    business_id: uuid("business_id"),
    branch_id: uuid("branch_id"),
    payload: jsonb("payload").notNull().default({}),
    version: integer("version").default(1).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    cursorIdx: index("sync_events_cursor_idx").on(table.id),
    entityIdx: index("sync_events_entity_idx").on(
      table.entity_type,
      table.entity_id,
    ),
    branchCursorIdx: index("sync_events_branch_cursor_idx").on(
      table.branch_id,
      table.id,
    ),
  }),
);
