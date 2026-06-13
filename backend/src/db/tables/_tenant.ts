import { uuid } from "drizzle-orm/pg-core";
import { businesses } from "./businesses.table";
import { branches } from "./branches.table";

// Shared row-level tenancy columns. Spread `...tenantColumns()` into any operational
// table so every row carries its owning business and branch. A factory is used (not a
// shared object) because Drizzle column builders are stateful and bound per-table.
//
//   business_id → ownership / cross-branch reporting axis
//   branch_id   → data-isolation axis (the real tenant boundary)
export const tenantColumns = () => ({
  business_id: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  branch_id: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
});
