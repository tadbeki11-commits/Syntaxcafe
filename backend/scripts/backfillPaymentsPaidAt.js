/**
 * Backfill payments.created_at from payments.paid_at for a single branch.
 *
 * Sets created_at = paid_at for every payment row matching the given
 * business_id + branch_id.
 *
 * Usage:
 *   PROD_DATABASE_URL="postgres://user:pass@host:5432/db" DRY=1 node scripts/backfillPaymentsPaidAt.js   # preview only
 *   PROD_DATABASE_URL="postgres://user:pass@host:5432/db"       node scripts/backfillPaymentsPaidAt.js   # apply
 *
 * Notes:
 *  - DRY=1 prints how many rows WOULD change and makes no writes.
 *  - Only rows where created_at differs from paid_at are touched (idempotent).
 *  - Requires an explicit PROD_DATABASE_URL so you can never hit the wrong DB by accident.
 */
const { Client } = require("pg");


const BUSINESS_ID = "218baaaf-a73f-4c50-88c1-89f2e80582f7";
const BRANCH_ID = "26b10f01-2f2b-4ba9-90f5-5f83cdadbc62";

const DRY = "2"=== "1";
const CONN = "postgres://postgres:gPKqP7qCW0Ll7UgrIegcyoCXFl75DgT3lA0f29Obv4GYuI1gmJNxJxGFX9nvRYla@37.60.230.104:5450/postgres";

async function main() {
  if (!CONN) {
    console.error("Refusing to run: set PROD_DATABASE_URL to the production connection string.");
    process.exit(1);
  }

  const db = new Client({ connectionString: CONN });
  await db.connect();

  try {
    // const where = `business_id = $1 AND branch_id = $2`;
    // const params = [BUSINESS_ID, BRANCH_ID];

    const total = await db.query(
      `SELECT count(*)::int AS n FROM payments`,
      params,
    );
    const toChange = await db.query(
      `SELECT count(*)::int AS n FROM payments
         WHERE created_at IS DISTINCT FROM paid_at`,
      params,
    );

    console.log(`Matched rows for branch: ${total.rows[0].n}`);
    console.log(`Rows where created_at != paid_at: ${toChange.rows[0].n}`);

    if (DRY) {
      console.log("DRY=1 — no changes written.");
      return;
    }

    const res = await db.query(
      `UPDATE payments
          SET created_at = paid_at
        WHERE created_at IS DISTINCT FROM paid_at AND paid_at IS NOT NULL`,
      params,
    );
    console.log(`Updated ${res.rowCount} row(s).`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
