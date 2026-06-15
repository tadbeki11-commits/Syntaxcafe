/*
 * INCREMENTAL top-up: append a single day's operational data from the old
 * single-tenant luxury1_db (5461) into the ALREADY-migrated Luxuary_cafe
 * Branch1 in the multi-tenant production DB (5450).
 * (luxury1_db == Branch1; luxury2_db == Branch2.)
 *
 * The original full migration (migrateArabsa.js) generated random UUIDs and did
 * NOT persist the int->uuid maps. So for dimension tables (users, menu_items,
 * inventory_items, stock_locations) we rebuild old-int -> new-uuid maps by
 * matching the already-migrated target rows on natural keys. Every referenced
 * FK MUST resolve or the run aborts.
 *
 * Scope = source rows with created_at::date = DAY (orders/order_items/payments/
 * stock_movements). No transfers today. New UUIDs are minted for orders &
 * order_items; payments/stock_movements are remapped onto them.
 *
 * Usage:
 *   DRY=1 node scripts/migrateLuxuryTodayIncremental.js   (read + validate, no writes)
 *       node scripts/migrateLuxuryTodayIncremental.js      (execute in one txn)
 */
const { Client } = require("pg");
const { randomUUID } = require("crypto");

const SRC =
  "postgres://postgres:donXYhApLQ2aKkjFgewOdeRaIiB1HEs1SbCvE6Ck5gkatka1hyFEBswB2c8XdOLD@37.60.230.104:5461/luxury1_db";
const TGT =
  "postgres://postgres:gPKqP7qCW0Ll7UgrIegcyoCXFl75DgT3lA0f29Obv4GYuI1gmJNxJxGFX9nvRYla@37.60.230.104:5450/postgres";

const DRY = process.env.DRY === "1";
const DAY = process.env.DAY || "2026-06-15";
const BUSINESS_ID = "218baaaf-a73f-4c50-88c1-89f2e80582f7";
const BRANCH_ID = "26b10f01-2f2b-4ba9-90f5-5f83cdadbc62";

async function main() {
  const src = new Client({ connectionString: SRC });
  const tgt = new Client({ connectionString: TGT });
  await src.connect();
  await tgt.connect();

  // ---- sanity: business + branch exist ----
  const chk = await tgt.query(
    "SELECT 1 FROM branches WHERE id=$1 AND business_id=$2",
    [BRANCH_ID, BUSINESS_ID],
  );
  if (!chk.rowCount) throw new Error("Luxuary branch/business not found in target.");

  // ---- watermark: latest already-migrated order in target ----
  const wm = await tgt.query(
    "SELECT max(created_at) m, count(*)::int n FROM orders WHERE branch_id=$1",
    [BRANCH_ID],
  );
  const watermark = wm.rows[0].m;
  console.log(`target already has ${wm.rows[0].n} orders, max created_at=${watermark && watermark.toISOString()}`);

  // ---- read today's source operational rows ----
  const q = async (sql, p) => (await src.query(sql, p)).rows;
  const orders = await q(
    "SELECT * FROM orders WHERE created_at::date=$1 ORDER BY id",
    [DAY],
  );
  if (!orders.length) throw new Error(`No source orders for ${DAY}. Nothing to do.`);
  const orderIds = orders.map((o) => o.id);
  const minNew = orders.reduce((a, o) => (o.created_at < a ? o.created_at : a), orders[0].created_at);
  if (watermark && minNew <= watermark) {
    throw new Error(
      `Overlap: earliest ${DAY} order (${minNew.toISOString()}) <= target watermark (${watermark.toISOString()}). Aborting to avoid duplicates.`,
    );
  }

  const inList = (arr) => `(${arr.map((_, i) => `$${i + 1}`).join(",")})`;
  const orderItems = await q(
    `SELECT * FROM order_items WHERE order_id IN ${inList(orderIds)} ORDER BY id`,
    orderIds,
  );
  const payments = await q(
    `SELECT * FROM payments WHERE order_id IN ${inList(orderIds)} ORDER BY id`,
    orderIds,
  );
  const movements = await q(
    "SELECT * FROM stock_movements WHERE created_at::date=$1 ORDER BY id",
    [DAY],
  );
  console.log(
    `source ${DAY}: orders=${orders.length} order_items=${orderItems.length} payments=${payments.length} stock_movements=${movements.length}`,
  );

  // ---- read source + target dimension tables, build int -> uuid maps ----
  // Luxuary has TWO branches under one business, each with its own copy of the
  // dimension rows, so business-scope lookups are ambiguous. All four dimension
  // tables carry branch_id, so we scope the target lookup to THIS branch
  // (verified unique within Branch1 for the keys referenced today).
  const buildMap = async (table, key) => {
    const sRows = await q(`SELECT id, ${key} k FROM ${table}`);
    const tRows = (
      await tgt.query(
        `SELECT id, ${key} k FROM ${table} WHERE branch_id=$1`,
        [BRANCH_ID],
      )
    ).rows;
    // target key -> uuid (detect ambiguity)
    const tByKey = new Map();
    const ambiguous = new Set();
    for (const r of tRows) {
      if (tByKey.has(r.k)) ambiguous.add(r.k);
      tByKey.set(r.k, r.id);
    }
    const map = new Map(); // source int id -> target uuid
    const ambiguousUsed = new Set();
    for (const r of sRows) {
      const u = tByKey.get(r.k);
      if (u) map.set(r.id, { uuid: u, key: r.k });
    }
    return { map, ambiguous };
  };

  const userM = await buildMap("users", "username");
  const menuM = await buildMap("menu_items", "name");
  const invM = await buildMap("inventory_items", "name");
  const locM = await buildMap("stock_locations", "slug");

  // resolver that hard-fails on any unresolved / ambiguous referenced FK
  const errors = [];
  const resolve = (m, srcId, ctx) => {
    if (srcId == null) return null;
    const hit = m.map.get(srcId);
    if (!hit) {
      errors.push(`${ctx}: source id ${srcId} has no target match`);
      return null;
    }
    if (m.ambiguous.has(hit.key)) {
      errors.push(`${ctx}: source id ${srcId} matches AMBIGUOUS key "${hit.key}"`);
      return null;
    }
    return hit.uuid;
  };

  // ---- mint new uuids for today's orders/order_items ----
  const orderMap = new Map();
  orders.forEach((o) => orderMap.set(o.id, randomUUID()));
  const oiMap = new Map();
  orderItems.forEach((oi) => oiMap.set(oi.id, randomUUID()));
  const ro = (id, ctx) => {
    if (id == null) return null;
    const u = orderMap.get(id);
    if (!u) errors.push(`${ctx}: order id ${id} not in today's set`);
    return u || null;
  };
  const roi = (id, ctx) => {
    if (id == null) return null;
    const u = oiMap.get(id);
    if (!u) errors.push(`${ctx}: order_item id ${id} not in today's set`);
    return u || null;
  };

  const tc = { business_id: BUSINESS_ID, branch_id: BRANCH_ID };

  const orderRows = orders.map((o) => ({
    id: orderMap.get(o.id),
    ...tc,
    order_number: null,
    customer_id: o.customer_id,
    organization_id: null,
    is_price_override: o.is_price_override,
    employee_id: resolve(userM, o.employee_id, `order ${o.id}.employee_id`),
    table_number: o.table_number,
    waiter_id: resolve(userM, o.waiter_id, `order ${o.id}.waiter_id`),
    cashier_id: resolve(userM, o.cashier_id, `order ${o.id}.cashier_id`),
    type: o.type,
    status: o.status,
    payment_status: o.payment_status,
    total_amount: o.total_amount,
    total_cents: o.total_cents,
    notes: o.notes,
    meta: o.meta,
    created_at: o.created_at,
    updated_at: o.updated_at,
  }));

  const oiRows = orderItems.map((oi) => ({
    id: oiMap.get(oi.id),
    ...tc,
    order_id: ro(oi.order_id, `order_item ${oi.id}.order_id`),
    menu_item_id: resolve(menuM, oi.menu_item_id, `order_item ${oi.id}.menu_item_id`),
    menu_id: resolve(menuM, oi.menu_id, `order_item ${oi.id}.menu_id`),
    quantity: oi.quantity,
    unit_price: oi.unit_price,
    unit_price_cents: oi.unit_price_cents,
    subtotal: oi.subtotal,
    item_type: oi.item_type,
    main_category: oi.main_category,
    created_at: oi.created_at,
  }));

  const payRows = payments.map((p) => ({
    id: randomUUID(),
    ...tc,
    order_id: ro(p.order_id, `payment ${p.id}.order_id`),
    amount_cents: p.amount_cents,
    amount: p.amount,
    method: p.method,
    payment_method: p.payment_method,
    status: p.status,
    processed_by: resolve(userM, p.processed_by, `payment ${p.id}.processed_by`),
    description: p.description,
    qr_code: p.qr_code,
    paid_at: p.paid_at,
    meta: p.meta,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  const smRows = movements.map((sm) => ({
    id: randomUUID(),
    ...tc,
    inventory_item_id: resolve(invM, sm.inventory_item_id, `movement ${sm.id}.inventory_item_id`),
    movement_type: sm.movement_type,
    location: sm.location,
    location_id: resolve(locM, sm.location_id, `movement ${sm.id}.location_id`),
    quantity_delta: sm.quantity_delta,
    quantity_after: sm.quantity_after,
    transfer_id: null, // none today
    order_id: ro(sm.order_id, `movement ${sm.id}.order_id`),
    order_item_id: roi(sm.order_item_id, `movement ${sm.id}.order_item_id`),
    notes: sm.notes,
    created_by: resolve(userM, sm.created_by, `movement ${sm.id}.created_by`),
    meta: sm.meta,
    created_at: sm.created_at,
  }));

  if (errors.length) {
    console.error(`\n${errors.length} unresolved references:`);
    errors.slice(0, 50).forEach((e) => console.error("  - " + e));
    throw new Error("Aborting: unresolved FK references (see above).");
  }
  console.log("all FK references resolved ✓");

  if (DRY) {
    console.log("\nDRY run — no writes. Would insert:", {
      orders: orderRows.length,
      order_items: oiRows.length,
      payments: payRows.length,
      stock_movements: smRows.length,
    });
    await src.end();
    await tgt.end();
    return;
  }

  async function ins(table, cols, rows) {
    if (!rows.length) return console.log(`  ${table}: 0 (skipped)`);
    const chunk = 400;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const params = [];
      const tuples = slice.map((row) => {
        const ph = cols.map((c) => {
          let v = row[c];
          if (v !== null && typeof v === "object" && !(v instanceof Date)) v = JSON.stringify(v);
          params.push(v);
          return `$${params.length}`;
        });
        return `(${ph.join(",")})`;
      });
      await tgt.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${tuples.join(",")}`, params);
    }
    console.log(`  ${table}: ${rows.length}`);
  }

  await tgt.query("BEGIN");
  try {
    await ins("orders", ["id", "business_id", "branch_id", "order_number", "customer_id", "organization_id", "is_price_override", "employee_id", "table_number", "waiter_id", "cashier_id", "type", "status", "payment_status", "total_amount", "total_cents", "notes", "meta", "created_at", "updated_at"], orderRows);
    await ins("order_items", ["id", "business_id", "branch_id", "order_id", "menu_item_id", "menu_id", "quantity", "unit_price", "unit_price_cents", "subtotal", "item_type", "main_category", "created_at"], oiRows);
    await ins("payments", ["id", "business_id", "branch_id", "order_id", "amount_cents", "amount", "method", "payment_method", "status", "processed_by", "description", "qr_code", "paid_at", "meta", "created_at", "updated_at"], payRows);
    await ins("stock_movements", ["id", "business_id", "branch_id", "inventory_item_id", "movement_type", "location", "location_id", "quantity_delta", "quantity_after", "transfer_id", "order_id", "order_item_id", "notes", "created_by", "meta", "created_at"], smRows);

    await tgt.query("COMMIT");
    console.log(`\nCOMMITTED ${DAY} top-up -> Luxuary Branch1 ${BRANCH_ID}.`);
  } catch (e) {
    await tgt.query("ROLLBACK");
    console.error("ROLLED BACK:", e.message);
    throw e;
  } finally {
    await src.end();
    await tgt.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
