import { db } from "../src/db/drizzle";
import { businesses } from "../src/db/tables/businesses.table";
import { branches } from "../src/db/tables/branches.table";
import {
  DEFAULT_BRANCH_ID,
  DEFAULT_BUSINESS_ID,
} from "../src/common/tenant/tenant-context";

// Dev scripts run outside the HTTP request lifecycle, so there is no tenant
// middleware. They seed/restore against the default business + branch instead.
export { DEFAULT_BRANCH_ID, DEFAULT_BUSINESS_ID };

/** Tenant columns for seed inserts into the 22 branch-scoped tables. */
export const tcols = () => ({
  business_id: DEFAULT_BUSINESS_ID,
  branch_id: DEFAULT_BRANCH_ID,
});

/** Creates the default business + branch if missing. Call before any seed insert. */
export async function ensureDefaultTenant(): Promise<void> {
  await db
    .insert(businesses)
    .values({
      id: DEFAULT_BUSINESS_ID,
      name: "Default Business",
      slug: "default-business",
    })
    .onConflictDoNothing();
  await db
    .insert(branches)
    .values({
      id: DEFAULT_BRANCH_ID,
      business_id: DEFAULT_BUSINESS_ID,
      name: "Main Branch",
      slug: "main-branch",
    })
    .onConflictDoNothing();
}
