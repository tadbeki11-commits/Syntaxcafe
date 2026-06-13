import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users.table";
import { stockLocations } from "./stock-locations.table";
import { tenantColumns } from "./_tenant";

export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...tenantColumns(),
  from_location: varchar("from_location", { length: 50 }), // legacy field
  to_location: varchar("to_location", { length: 50 }), // legacy field
  from_location_id: uuid("from_location_id").references(
    () => stockLocations.id,
    { onDelete: "restrict" },
  ),
  to_location_id: uuid("to_location_id").references(
    () => stockLocations.id,
    { onDelete: "restrict" },
  ),
  status: varchar("status", { length: 50 }).default("sent").notNull(),
  notes: text("notes"),
  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  received_by: uuid("received_by").references(() => users.id, {
    onDelete: "set null",
  }),
  received_at: timestamp("received_at"),
  meta: jsonb("meta").default({}),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
