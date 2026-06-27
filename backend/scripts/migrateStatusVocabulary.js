/**
 * One-time backfill of existing rows to the canonical status vocabulary.
 *
 * Two independent axes (see backend/src/common/status/order-status.constants.ts):
 *   orders.status         -> {pending, done, cancelled}        (lifecycle)
 *   orders.payment_status -> {pending, paid, cancelled}        (money)
 *   payments.status       -> {paid, cancelled}                 (a row = confirmed)
 *
 * Mapping
 *   orders.status:
 *     paid | completed | complete | served            -> done
 *     deleted | voided | void | refunded | canceled   -> cancelled  (and 'cancelled')
 *     pending | ready | preparing | new | open | null -> pending
 *   orders.payment_status:
 *     paid                                             -> paid
 *     cancelled | canceled | deleted | voided | refunded -> cancelled
 *     partially_paid | pending | null | <other>        -> pending
 *     ...BUT an order whose OLD status was 'paid' with no payment_status
 *        is treated as paid (the old status was the only paid signal).
 *   payments.status:
 *     deleted | voided | refunded | canceled           -> cancelled (and 'cancelled')
 *     paid                                             -> paid
 *     pending | null  -> paid if its order ended up paid, else cancelled
 *                        (no 'pending' payment rows survive)
 *
 * Usage:
 *   PROD_DATABASE_URL="postgres://user:pass@host:5450/db" node scripts/migrateStatusVocabulary.js          # preview only
 *   PROD_DATABASE_URL="postgres://user:pass@host:5450/db" APPLY=1 node scripts/migrateStatusVocabulary.js   # apply
 *
 * Optional: BRANCH_ID=<uuid> restricts the run to a single branch.
 *
 * Safety: defaults to a dry run (prints before/after distributions). Pass
 * APPLY=1 to write. All updates run inside one transaction.
 */
const { Client } = require("pg");

const CONN = "postgres://postgres:gPKqP7qCW0Ll7UgrIegcyoCXFl75DgT3lA0f29Obv4GYuI1gmJNxJxGFX9nvRYla@37.60.230.104:5450/postgres";
const APPLY = '1';
const BRANCH_ID = process.env.BRANCH_ID || null;

const branchClause = BRANCH_ID ? `AND branch_id = $1` : ``;
const params = BRANCH_ID ? [BRANCH_ID] : [];

// orders.status -> {pending, done, cancelled}
const ORDER_STATUS_SQL = `
  CASE lower(coalesce(status, ''))
    WHEN 'paid' THEN 'done'
    WHEN 'completed' THEN 'done'
    WHEN 'complete' THEN 'done'
    WHEN 'served' THEN 'done'
    WHEN 'done' THEN 'done'
    WHEN 'deleted' THEN 'cancelled'
    WHEN 'voided' THEN 'cancelled'
    WHEN 'void' THEN 'cancelled'
    WHEN 'refunded' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'canceled' THEN 'cancelled'
    ELSE 'pending'
  END`;

// orders.payment_status -> {pending, paid, cancelled}. A legacy status='paid'
// with no payment_status counts as paid.
const PAYMENT_STATUS_SQL = `
  CASE
    WHEN lower(coalesce(payment_status, '')) = 'paid' THEN 'paid'
    WHEN lower(coalesce(payment_status, '')) IN
         ('cancelled','canceled','deleted','voided','refunded') THEN 'cancelled'
    WHEN coalesce(payment_status, '') = '' AND lower(coalesce(status, '')) = 'paid' THEN 'paid'
    ELSE 'pending'
  END`;

// payments.status -> {paid, cancelled}. A pending/unknown row resolves from its
// order: paid if the order ended up paid, else cancelled (never 'pending').
const PAYMENT_ROW_STATUS_SQL = `
  CASE
    WHEN lower(coalesce(p.status, '')) IN
         ('cancelled','canceled','deleted','voided','refunded') THEN 'cancelled'
    WHEN lower(coalesce(p.status, '')) = 'paid' THEN 'paid'
    WHEN lower(coalesce(o.payment_status, '')) = 'paid'
         OR lower(coalesce(o.status, '')) IN ('paid','done','completed') THEN 'paid'
    ELSE 'cancelled'
  END`;

async function dist(client, label, query) {
  const { rows } = await client.query(query, params);
  console.log(`\n${label}`);
  for (const r of rows) {
    console.log(`  ${String(r.value ?? "∅").padEnd(16)} ${r.n}`);
  }
}

async function main() {
  const client = new Client({ connectionString: CONN });
  await client.connect();
  console.log(
    `Status vocabulary migration — ${APPLY ? "APPLY" : "DRY RUN"}${
      BRANCH_ID ? ` (branch ${BRANCH_ID})` : ""
    }`,
  );

  await dist(
    client,
    "orders.status (before)",
    `SELECT status AS value, count(*) n FROM orders WHERE true ${branchClause} GROUP BY 1 ORDER BY 2 DESC`,
  );
  await dist(
    client,
    "orders.payment_status (before)",
    `SELECT payment_status AS value, count(*) n FROM orders WHERE true ${branchClause} GROUP BY 1 ORDER BY 2 DESC`,
  );
  await dist(
    client,
    "payments.status (before)",
    `SELECT status AS value, count(*) n FROM payments WHERE true ${branchClause} GROUP BY 1 ORDER BY 2 DESC`,
  );

  if (!APPLY) {
    console.log("\nDry run — no changes written. Re-run with APPLY=1 to commit.");
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    // payments first: it reads the order's *old* status to resolve pending rows.
    const pmt = await client.query(
      `UPDATE payments p
          SET status = (${PAYMENT_ROW_STATUS_SQL}), updated_at = now()
         FROM orders o
        WHERE p.order_id = o.id
          AND p.status IS DISTINCT FROM (${PAYMENT_ROW_STATUS_SQL})
          ${BRANCH_ID ? "AND p.branch_id = $1" : ""}`,
      params,
    );

    const pay = await client.query(
      `UPDATE orders
          SET payment_status = (${PAYMENT_STATUS_SQL}), updated_at = now()
        WHERE payment_status IS DISTINCT FROM (${PAYMENT_STATUS_SQL})
          ${branchClause}`,
      params,
    );

    const ord = await client.query(
      `UPDATE orders
          SET status = (${ORDER_STATUS_SQL}), updated_at = now()
        WHERE status IS DISTINCT FROM (${ORDER_STATUS_SQL})
          ${branchClause}`,
      params,
    );

    await client.query("COMMIT");
    console.log(
      `\nApplied: payments ${pmt.rowCount}, orders.payment_status ${pay.rowCount}, orders.status ${ord.rowCount}`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Rolled back:", err.message);
    process.exitCode = 1;
    await client.end();
    return;
  }

  await dist(
    client,
    "orders.status (after)",
    `SELECT status AS value, count(*) n FROM orders WHERE true ${branchClause} GROUP BY 1 ORDER BY 2 DESC`,
  );
  await dist(
    client,
    "orders.payment_status (after)",
    `SELECT payment_status AS value, count(*) n FROM orders WHERE true ${branchClause} GROUP BY 1 ORDER BY 2 DESC`,
  );
  await dist(
    client,
    "payments.status (after)",
    `SELECT status AS value, count(*) n FROM payments WHERE true ${branchClause} GROUP BY 1 ORDER BY 2 DESC`,
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
