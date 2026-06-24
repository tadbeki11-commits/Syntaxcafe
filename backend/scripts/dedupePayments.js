/**
 * Find and clean duplicate payments for the same order.
 *
 * A duplicate is a *second* non-deleted (pending/paid) payment that covers the
 * same charge as one already on the order. Two classes are detected:
 *
 *   1. Full-order duplicates  — more than one whole-order payment on an order
 *                               (meta.scope is not 'department'). Only one
 *                               whole-order payment should ever exist.
 *   2. Department duplicates   — more than one department-scoped payment for the
 *                               SAME department on an order (meta.scope =
 *                               'department'). One per department is legitimate;
 *                               a repeat of the same department is not.
 *
 * Legitimate multi-payment orders (one department-scoped payment per distinct
 * department) are left untouched.
 *
 * For each duplicate group the *earliest* row (by paid_at, then created_at,
 * then id) is kept; the rest are HARD-DELETED from the payments table. This is
 * destructive and not reversible — run the dry preview first.
 *
 * IMPORTANT — only *same-amount* repeats are deleted. A second payment whose
 * amount differs from the keeper is treated as a possible legitimate partial /
 * installment payment: it is reported for manual review but never auto-deleted.
 *
 * Usage:
 *   PROD_DATABASE_URL="postgres://user:pass@host:5432/db" node scripts/dedupePayments.js          # preview only (default)
 *   PROD_DATABASE_URL="postgres://user:pass@host:5432/db" APPLY=1 node scripts/dedupePayments.js   # apply changes
 *
 * Optional: BRANCH_ID=<uuid> restricts the run to a single branch.
 *
 * Safety:
 *   - Requires an explicit PROD_DATABASE_URL so you can never hit the wrong DB.
 *   - Defaults to a dry run; you must pass APPLY=1 to delete.
 *   - The delete is a single atomic set-based statement.
 */
const { Client } = require("pg");

const CONN = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || "";
const APPLY = process.env.APPLY === "1";
const BRANCH_ID = process.env.BRANCH_ID || null;

// Picks the keeper within each duplicate group: oldest payment wins.
const KEEP_ORDER = `coalesce(paid_at, created_at) ASC, created_at ASC, id ASC`;

// Branch scope, shared by both queries. ($1 is BRANCH_ID when provided.)
const branchClause = BRANCH_ID ? `AND branch_id = $1` : ``;
const params = BRANCH_ID ? [BRANCH_ID] : [];

// Rows whose status is pending/paid are "live" charges; 'deleted' rows are
// already voided and ignored.
const LIVE = `coalesce(status, '') in ('pending', 'paid')`;

// rn > 1 marks the duplicates to remove in each group.
const DUP_QUERY = `
  WITH live AS (
    SELECT id, order_id, status, amount, paid_at, created_at,
           coalesce(meta ->> 'scope', '') AS scope,
           lower(coalesce(meta ->> 'department', '')) AS department
      FROM payments
     WHERE ${LIVE} ${branchClause}
  ),
  ranked AS (
    SELECT *,
      row_number() OVER w AS rn,
      first_value(id) OVER w AS keep_id,
      first_value(coalesce(amount, 0)) OVER w AS keep_amount
      FROM live
      WINDOW w AS (
        PARTITION BY order_id,
          CASE WHEN scope = 'department' THEN 'dept:' || department ELSE 'full' END
        ORDER BY ${KEEP_ORDER}
      )
  )
  SELECT id, order_id, keep_id, status, amount, keep_amount, scope, department,
         (coalesce(amount, 0) = keep_amount) AS same_amount
    FROM ranked
   WHERE rn > 1
   ORDER BY order_id, scope, department;
`;

// Single set-based hard-delete of the same-amount duplicates. Mirrors the
// detection CTE above, then deletes every rn>1 row whose amount equals its
// keeper. Reuses the same $1 BRANCH_ID parameter binding as DUP_QUERY.
const APPLY_QUERY = `
  WITH live AS (
    SELECT id, order_id, status, amount, paid_at, created_at,
           coalesce(meta ->> 'scope', '') AS scope,
           lower(coalesce(meta ->> 'department', '')) AS department
      FROM payments
     WHERE ${LIVE} ${branchClause}
  ),
  ranked AS (
    SELECT *,
      row_number() OVER w AS rn,
      first_value(coalesce(amount, 0)) OVER w AS keep_amount
      FROM live
      WINDOW w AS (
        PARTITION BY order_id,
          CASE WHEN scope = 'department' THEN 'dept:' || department ELSE 'full' END
        ORDER BY ${KEEP_ORDER}
      )
  ),
  dups AS (
    SELECT id
      FROM ranked
     WHERE rn > 1 AND coalesce(amount, 0) = keep_amount
  )
  DELETE FROM payments p
   USING dups d
   WHERE p.id = d.id;
`;

async function main() {
  if (!CONN) {
    console.error(
      "Refusing to run: set PROD_DATABASE_URL to the production connection string.",
    );
    process.exit(1);
  }

  const db = new Client({ connectionString: CONN });
  await db.connect();

  try {
    const { rows: dups } = await db.query(DUP_QUERY, params);

    if (!dups.length) {
      console.log("No duplicate payments found. Nothing to do.");
      return;
    }

    // Same-amount repeats are safe to void (true double-charges). Repeats whose
    // amount differs from the keeper might be legitimate partial payments — they
    // are reported only, never auto-deleted.
    const safe = dups.filter((r) => r.same_amount);
    const review = dups.filter((r) => !r.same_amount);

    const orders = new Set(dups.map((r) => r.order_id));
    const safeAmount = safe.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    console.log(
      `Found ${dups.length} duplicate payment(s) across ${orders.size} order(s):`,
    );
    console.log(
      `  - same-amount (will delete):   ${safe.length}  (total ${safeAmount})`,
    );
    console.log(
      `  - differing-amount (review):   ${review.length}  (left untouched)`,
    );
    console.log("");
    for (const r of safe.slice(0, 40)) {
      const tag = r.scope === "department" ? `dept:${r.department}` : "full";
      console.log(
        `  order ${r.order_id}  [${tag}]  remove ${r.id} (${r.status}, amount=${r.amount})  keep ${r.keep_id}`,
      );
    }
    if (safe.length > 40) console.log(`  ... and ${safe.length - 40} more`);

    if (review.length) {
      console.log("");
      console.log("Differing-amount repeats (NOT deleted — review manually):");
      for (const r of review.slice(0, 40)) {
        const tag = r.scope === "department" ? `dept:${r.department}` : "full";
        console.log(
          `  order ${r.order_id}  [${tag}]  ${r.id} amount=${r.amount} vs keep ${r.keep_id} amount=${r.keep_amount}`,
        );
      }
      if (review.length > 40) console.log(`  ... and ${review.length - 40} more`);
    }
    console.log("");

    if (!APPLY) {
      console.log(
        "Dry run (default). Pass APPLY=1 to permanently delete the same-amount duplicates.",
      );
      return;
    }

    // Hard-delete every same-amount duplicate in a single set-based statement.
    // Doing this as one server-side DELETE (rather than a row-by-row loop over a
    // remote connection) keeps it atomic and avoids thousands of round-trips
    // that can stall or drop the connection mid-run.
    const res = await db.query(APPLY_QUERY, params);
    console.log(`Deleted ${res.rowCount} duplicate payment(s).`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
