/**
 * Remediation for the status-vocabulary rollout: close paid orders whose
 * lifecycle was left at "pending".
 *
 * The first cut of the new payment flow set only orders.payment_status='paid'
 * and stopped moving orders.status to "done". In this POS payment IS the
 * completion event (there is no separate "served" step), so a paid order should
 * read as done — otherwise it lingers in every "pending orders" view. This also
 * folds any leftover legacy status='paid' (written by an old backend instance)
 * into 'done'.
 *
 * Closes: orders where payment_status='paid' AND status IN ('pending','paid'),
 * plus any status='paid'. Leaves genuinely-unpaid pending orders untouched.
 *
 * Usage:
 *   PROD_DATABASE_URL="postgres://…:5450/db" node scripts/fixPaidOrdersLifecycle.js          # preview
 *   PROD_DATABASE_URL="postgres://…:5450/db" APPLY=1 node scripts/fixPaidOrdersLifecycle.js   # apply
 *   Optional: BRANCH_ID=<uuid>
 */
const { Client } = require("pg");

const CONN =
  process.env.PROD_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5450/postgres";
const APPLY = process.env.APPLY === "1";
const BRANCH_ID = process.env.BRANCH_ID || null;

const branchClause = BRANCH_ID ? `AND branch_id = $1` : ``;
const params = BRANCH_ID ? [BRANCH_ID] : [];

// A paid order that never closed, OR a legacy 'paid' lifecycle leftover.
const TARGET = `(
  (lower(coalesce(payment_status, '')) = 'paid' AND lower(coalesce(status, '')) IN ('pending', 'paid'))
  OR lower(coalesce(status, '')) = 'paid'
)`;

async function main() {
  const client = new Client({ connectionString: CONN });
  await client.connect();
  console.log(
    `Close paid-but-pending orders — ${APPLY ? "APPLY" : "DRY RUN"}${
      BRANCH_ID ? ` (branch ${BRANCH_ID})` : ""
    }`,
  );

  const { rows: preview } = await client.query(
    `SELECT status, payment_status, count(*) n
       FROM orders WHERE ${TARGET} ${branchClause}
      GROUP BY 1, 2 ORDER BY 3 DESC`,
    params,
  );
  console.log("\nOrders to be closed to status='done':");
  console.table(preview);

  if (!APPLY) {
    console.log("\nDry run — no changes written. Re-run with APPLY=1.");
    await client.end();
    return;
  }

  const res = await client.query(
    `UPDATE orders SET status = 'done', updated_at = now()
      WHERE ${TARGET} AND lower(coalesce(status, '')) <> 'done' ${branchClause}`,
    params,
  );
  console.log(`\nApplied: ${res.rowCount} orders closed to 'done'.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
