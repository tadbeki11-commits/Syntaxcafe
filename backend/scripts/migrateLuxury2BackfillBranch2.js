/*
 * FULL BACKFILL (no time filter): push everything from single-tenant luxury2_db
 * (5461) into Luxuary_cafe Branch2 in the multi-tenant prod DB (5450) that does
 * NOT already exist there. (luxury2_db == Branch2; luxury1_db == Branch1.)
 *
 * Why this is more than a watermark top-up: the earlier full migration of
 * Branch2 was PARTIAL. It migrated 283 orders + all their order_items, but the
 * children of the last ~20 of those orders were truncated (their payments and
 * sale stock_movements never got inserted). So "everything that doesn't exist"
 * means BOTH:
 *   (a) the 758 brand-new orders (+ all their children), and
 *   (b) backfilling the missing payments / sale-movements of already-migrated
 *       orders.
 *
 * Dedup keys (no persisted int->uuid map exists):
 *   - orders            : created_at is globally UNIQUE in source -> exact match
 *                         against target Branch2 orders. New = not present.
 *   - order_items       : already complete for migrated orders (asserted per
 *                         order); only NEW orders' items are inserted (minted).
 *   - payments/sale mvt : the truncation is all-or-nothing per order (verified:
 *                         target child count is either full or 0, never partial,
 *                         never extra). We backfill the full source child set for
 *                         any migrated order whose target child count is 0, and
 *                         insert all children for new orders. A partial/extra
 *                         case aborts the run.
 *   - non-order mvt     : the 4 source count/adjustment rows already exist in
 *                         target (created_at match) -> skipped.
 *   - transfers         : none in source.
 *
 * order_item_id on backfilled movements (existing orders) is resolved to the
 * already-present target order_item via a content signature
 * (menu_uuid|qty|unit_price_cents|subtotal); ties (identical line items) are
 * interchangeable so any assignment within a bucket is correct.
 *
 * Dimension maps (users, menu_items, inventory_items, stock_locations) are
 * scoped to THIS BRANCH (Luxuary has two branches, each with its own copy, so
 * business-scope would be ambiguous).
 *
 * Usage:
 *   DRY=1 node scripts/migrateLuxury2BackfillBranch2.js   (read + validate, no writes)
 *       node scripts/migrateLuxury2BackfillBranch2.js      (execute in one txn)
 */
const { Client } = require("pg");
const { randomUUID } = require("crypto");

const SRC =
  "postgres://postgres:donXYhApLQ2aKkjFgewOdeRaIiB1HEs1SbCvE6Ck5gkatka1hyFEBswB2c8XdOLD@37.60.230.104:5461/luxury2_db";
const TGT =
  "postgres://postgres:gPKqP7qCW0Ll7UgrIegcyoCXFl75DgT3lA0f29Obv4GYuI1gmJNxJxGFX9nvRYla@37.60.230.104:5450/postgres";

const DRY = process.env.DRY === "1";
const BUSINESS_ID = "218baaaf-a73f-4c50-88c1-89f2e80582f7";
const BRANCH_ID = "2bf146f2-e72b-4a79-b0cd-9c164ccfcfa4"; // Branch2

async function main() {
  const src = new Client({ connectionString: SRC });
  const tgt = new Client({ connectionString: TGT });
  await src.connect();
  await tgt.connect();
  const q = async (sql, p) => (await src.query(sql, p)).rows;
  const tq = async (sql, p) => (await tgt.query(sql, p)).rows;

  // ---- sanity ----
  const chk = await tgt.query(
    "SELECT 1 FROM branches WHERE id=$1 AND business_id=$2",
    [BRANCH_ID, BUSINESS_ID],
  );
  if (!chk.rowCount) throw new Error("Luxuary Branch2/business not found in target.");

  // ---- dimension maps, branch-scoped ----
  const buildMap = async (table, key) => {
    const sRows = await q(`SELECT id, ${key} k FROM ${table}`);
    const tRows = await tq(`SELECT id, ${key} k FROM ${table} WHERE branch_id=$1`, [BRANCH_ID]);
    const tByKey = new Map();
    const ambiguous = new Set();
    for (const r of tRows) {
      if (tByKey.has(r.k)) ambiguous.add(r.k);
      tByKey.set(r.k, r.id);
    }
    const map = new Map();
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
  const menuUuid = (id) => {
    const h = menuM.map.get(id);
    return h && !menuM.ambiguous.has(h.key) ? h.uuid : null;
  };

  // ---- read source operational rows ----
  const orders = await q("SELECT * FROM orders ORDER BY id");
  const orderItems = await q("SELECT * FROM order_items ORDER BY id");
  const payments = await q("SELECT * FROM payments ORDER BY id");
  const saleMovements = await q(
    "SELECT * FROM stock_movements WHERE order_id IS NOT NULL ORDER BY id",
  );
  const nonOrderMovements = await q(
    "SELECT * FROM stock_movements WHERE order_id IS NULL ORDER BY id",
  );

  // ---- read target Branch2 existing state ----
  const tOrders = await tq("SELECT id, created_at FROM orders WHERE branch_id=$1", [BRANCH_ID]);
  const tOrderByTs = new Map(tOrders.map((r) => [+r.created_at, r.id]));
  const tItems = await tq(
    "SELECT id, order_id, menu_item_id, quantity, unit_price_cents, subtotal FROM order_items WHERE branch_id=$1",
    [BRANCH_ID],
  );
  const tPayCount = new Map(
    (await tq("SELECT order_id, count(*)::int n FROM payments WHERE branch_id=$1 GROUP BY 1", [BRANCH_ID])).map((r) => [r.order_id, r.n]),
  );
  const tMovCount = new Map(
    (await tq("SELECT order_id, count(*)::int n FROM stock_movements WHERE branch_id=$1 AND order_id IS NOT NULL GROUP BY 1", [BRANCH_ID])).map((r) => [r.order_id, r.n]),
  );

  // ---- classify source orders ----
  const orderUuidById = new Map(); // src order id -> target uuid (existing or minted)
  const newOrderIds = new Set();
  for (const o of orders) {
    const existing = tOrderByTs.get(+o.created_at);
    if (existing) {
      orderUuidById.set(o.id, existing);
    } else {
      const u = randomUUID();
      orderUuidById.set(o.id, u);
      newOrderIds.add(o.id);
    }
  }
  console.log(
    `source orders=${orders.length} alreadyInTarget=${orders.length - newOrderIds.size} new=${newOrderIds.size}`,
  );

  // ---- order_items: mint for new orders; index source items per order ----
  const oiUuidById = new Map(); // src order_item id -> target uuid (new orders only)
  const srcItemsByOrder = new Map();
  for (const oi of orderItems) {
    if (!srcItemsByOrder.has(oi.order_id)) srcItemsByOrder.set(oi.order_id, []);
    srcItemsByOrder.get(oi.order_id).push(oi);
    if (newOrderIds.has(oi.order_id)) oiUuidById.set(oi.id, randomUUID());
  }

  // ---- map src order_item -> existing target order_item uuid (migrated orders) ----
  // group target items by order uuid, then by content signature.
  const tItemsByOrder = new Map();
  for (const it of tItems) {
    if (!tItemsByOrder.has(it.order_id)) tItemsByOrder.set(it.order_id, []);
    tItemsByOrder.get(it.order_id).push(it);
  }
  const sig = (menu_uuid, qty, upc, sub) => `${menu_uuid}|${qty}|${upc}|${sub}`;
  // assert order_items completeness per migrated order + build oi map for them
  for (const o of orders) {
    if (newOrderIds.has(o.id)) continue;
    const tUuid = orderUuidById.get(o.id);
    const sItems = srcItemsByOrder.get(o.id) || [];
    const tList = tItemsByOrder.get(tUuid) || [];
    // bucket target items by signature
    const buckets = new Map();
    for (const it of tList) {
      const k = sig(it.menu_item_id, it.quantity, it.unit_price_cents, it.subtotal);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(it.id);
    }
    for (const si of sItems) {
      const mu = menuUuid(si.menu_item_id);
      const k = sig(mu, si.quantity, si.unit_price_cents, si.subtotal);
      const bucket = buckets.get(k);
      if (!bucket || !bucket.length) {
        errors.push(
          `order_item ${si.id} (migrated order ${o.id}): no matching target item for signature ${k}`,
        );
        continue;
      }
      oiUuidById.set(si.id, bucket.shift());
    }
  }

  // ---- payments to insert: new orders (all) + migrated orders with 0 in target ----
  const tc = { business_id: BUSINESS_ID, branch_id: BRANCH_ID };
  const payRows = [];
  const payByOrder = new Map();
  for (const p of payments) {
    if (!payByOrder.has(p.order_id)) payByOrder.set(p.order_id, []);
    payByOrder.get(p.order_id).push(p);
  }
  for (const o of orders) {
    const isNew = newOrderIds.has(o.id);
    const tUuid = orderUuidById.get(o.id);
    const srcPays = payByOrder.get(o.id) || [];
    if (!srcPays.length) continue;
    if (!isNew) {
      const have = tPayCount.get(tUuid) || 0;
      if (have === srcPays.length) continue; // fully migrated
      if (have !== 0) {
        errors.push(`migrated order ${o.id}: PARTIAL payments (target=${have}, source=${srcPays.length}) — not handled`);
        continue;
      }
    }
    for (const p of srcPays) {
      payRows.push({
        id: randomUUID(),
        ...tc,
        order_id: tUuid,
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
      });
    }
  }

  // ---- sale movements to insert: new orders (all) + migrated orders with 0 ----
  const smRows = [];
  const movByOrder = new Map();
  for (const sm of saleMovements) {
    if (!movByOrder.has(sm.order_id)) movByOrder.set(sm.order_id, []);
    movByOrder.get(sm.order_id).push(sm);
  }
  for (const o of orders) {
    const isNew = newOrderIds.has(o.id);
    const tUuid = orderUuidById.get(o.id);
    const srcMovs = movByOrder.get(o.id) || [];
    if (!srcMovs.length) continue;
    if (!isNew) {
      const have = tMovCount.get(tUuid) || 0;
      if (have === srcMovs.length) continue;
      if (have !== 0) {
        errors.push(`migrated order ${o.id}: PARTIAL sale movements (target=${have}, source=${srcMovs.length}) — not handled`);
        continue;
      }
    }
    for (const sm of srcMovs) {
      const oiu = sm.order_item_id != null ? oiUuidById.get(sm.order_item_id) : null;
      if (sm.order_item_id != null && !oiu) {
        errors.push(`movement ${sm.id}: order_item ${sm.order_item_id} not resolvable`);
      }
      smRows.push({
        id: randomUUID(),
        ...tc,
        inventory_item_id: resolve(invM, sm.inventory_item_id, `movement ${sm.id}.inventory_item_id`),
        movement_type: sm.movement_type,
        location: sm.location,
        location_id: resolve(locM, sm.location_id, `movement ${sm.id}.location_id`),
        quantity_delta: sm.quantity_delta,
        quantity_after: sm.quantity_after,
        transfer_id: null,
        order_id: tUuid,
        order_item_id: oiu || null,
        notes: sm.notes,
        created_by: resolve(userM, sm.created_by, `movement ${sm.id}.created_by`),
        meta: sm.meta,
        created_at: sm.created_at,
      });
    }
  }

  // ---- new orders + their order_items ----
  const orderRows = [];
  for (const o of orders) {
    if (!newOrderIds.has(o.id)) continue;
    orderRows.push({
      id: orderUuidById.get(o.id),
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
    });
  }
  const oiRows = [];
  for (const oi of orderItems) {
    if (!newOrderIds.has(oi.order_id)) continue;
    oiRows.push({
      id: oiUuidById.get(oi.id),
      ...tc,
      order_id: orderUuidById.get(oi.order_id),
      menu_item_id: resolve(menuM, oi.menu_item_id, `order_item ${oi.id}.menu_item_id`),
      menu_id: resolve(menuM, oi.menu_id, `order_item ${oi.id}.menu_id`),
      quantity: oi.quantity,
      unit_price: oi.unit_price,
      unit_price_cents: oi.unit_price_cents,
      subtotal: oi.subtotal,
      item_type: oi.item_type,
      main_category: oi.main_category,
      created_at: oi.created_at,
    });
  }

  console.log(
    `to insert -> orders=${orderRows.length} order_items=${oiRows.length} payments=${payRows.length} sale_movements=${smRows.length}`,
  );
  console.log(
    `(non-order movements in source=${nonOrderMovements.length}, already present -> skipped; transfers=0)`,
  );

  if (errors.length) {
    console.error(`\n${errors.length} unresolved references:`);
    errors.slice(0, 50).forEach((e) => console.error("  - " + e));
    throw new Error("Aborting: unresolved references (see above).");
  }
  console.log("all references resolved ✓");

  if (DRY) {
    console.log("\nDRY run — no writes.");
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
    console.log(`\nCOMMITTED backfill -> Luxuary Branch2 ${BRANCH_ID}.`);
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
