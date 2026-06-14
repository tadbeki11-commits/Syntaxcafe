import { pgTable, uuid, integer } from "drizzle-orm/pg-core";
import { branches } from "./branches.table";

// One row per branch holding the last issued human-friendly order number.
// Orders get an ever-increasing serial scoped to their branch (the tenant
// boundary). Incremented atomically inside the order-create transaction via
// an INSERT ... ON CONFLICT DO UPDATE ... RETURNING, so concurrent creates
// never collide.
export const orderCounters = pgTable("order_counters", {
  branch_id: uuid("branch_id")
    .primaryKey()
    .references(() => branches.id, { onDelete: "cascade" }),
  last_number: integer("last_number").notNull().default(0),
});
