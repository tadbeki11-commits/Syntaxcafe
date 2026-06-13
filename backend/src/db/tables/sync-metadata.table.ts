import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

export const sync_metadata = pgTable("sync_metadata", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 100 }).notNull(),
  last_synced_at: timestamp("last_synced_at"),
  last_revision: integer("last_revision"),
});
