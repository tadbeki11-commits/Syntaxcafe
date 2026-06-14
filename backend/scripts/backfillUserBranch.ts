import { and, asc, eq, isNull, notInArray } from "drizzle-orm";
import { db, pool } from "../src/db/drizzle";
import { branches, users } from "../src/db/tables";

// One-off backfill for the per-branch users change. Existing staff were scoped
// only to a business; assign each branch-scoped user (everyone except owners and
// platform super admins) to its business's earliest-created branch. Cross-branch
// accounts keep branch_id = NULL.
async function backfill() {
  console.log("🔄 Backfilling users.branch_id ...");

  // Earliest-created branch per business.
  const branchRows = await db
    .select({ id: branches.id, business_id: branches.business_id })
    .from(branches)
    .orderBy(asc(branches.created_at));

  const firstBranchByBusiness = new Map<string, string>();
  for (const br of branchRows) {
    if (!firstBranchByBusiness.has(br.business_id)) {
      firstBranchByBusiness.set(br.business_id, br.id);
    }
  }

  // Users that need a branch: have a business, no branch yet, not owner/super_admin.
  const pending = await db
    .select({
      id: users.id,
      business_id: users.business_id,
      username: users.username,
    })
    .from(users)
    .where(
      and(
        isNull(users.branch_id),
        notInArray(users.role, ["owner", "super_admin"]),
      ),
    );

  let updated = 0;
  let skipped = 0;
  for (const u of pending) {
    const branchId = u.business_id
      ? firstBranchByBusiness.get(u.business_id)
      : undefined;
    if (!branchId) {
      console.warn(
        `  ⚠️  no branch for business ${u.business_id} — skipping user ${u.username ?? u.id}`,
      );
      skipped++;
      continue;
    }
    await db
      .update(users)
      .set({ branch_id: branchId, updated_at: new Date() })
      .where(eq(users.id, u.id));
    updated++;
  }

  console.log(`✅ Backfilled ${updated} user(s); skipped ${skipped}.`);
}

async function run() {
  try {
    await backfill();
  } catch (err) {
    console.error("❌ Backfill failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
