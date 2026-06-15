/*
 * CLEAN IMPORT: load single-tenant lebu_cafe_1 (5461) into the ALREADY-EXISTING
 * LebuCafe business + Branch1 in the multi-tenant prod DB (5450).
 *
 * Context: LebuCafe's business/branch/users + an owner were created during setup,
 * but the real menu/inventory/recipes were never imported. The branch only holds
 * junk: seed defaults (1 'cafe' category, 2 payment methods, 1 dining table, a
 * 'Test' org) and 6 test orders whose order_items have NULL menu_item_id.
 *
 * Plan (one transaction):
 *   1. DELETE the junk (operational rows + seed dimension rows) for this branch.
 *      USERS ARE KEPT.
 *   2. Reconcile users: source admin/cashier1 map onto the existing target
 *      accounts (same username); source salhadin/meheret are created new. The
 *      lone source order's waiter (meheret) resolves to the new account.
 *   3. Import every source dimension + operational row with fresh UUIDs, stamped
 *      with LebuCafe business_id / Branch1 branch_id.
 *
 * Source uses UUID PKs already; the int/uuid-agnostic id->uuid remap handles it.
 *
 * Usage:
 *   DRY=1 node scripts/migrateLebuIntoExisting.js   (read + plan, no writes)
 *       node scripts/migrateLebuIntoExisting.js      (execute in one txn)
 */
const { Client } = require("pg");
const { randomUUID } = require("crypto");

const SRC =
  "postgres://postgres:donXYhApLQ2aKkjFgewOdeRaIiB1HEs1SbCvE6Ck5gkatka1hyFEBswB2c8XdOLD@37.60.230.104:5461/lebu_cafe_1";
const TGT =
  "postgres://postgres:gPKqP7qCW0Ll7UgrIegcyoCXFl75DgT3lA0f29Obv4GYuI1gmJNxJxGFX9nvRYla@37.60.230.104:5450/postgres";

const DRY = process.env.DRY === "1";
const BUSINESS_ID = "64fc581e-3887-4c91-9af2-84dd9655fe7c"; // LebuCafe
const BRANCH_ID = "8a669bad-93fa-4160-832f-f42d24dc7de3"; // Branch1

async function main() {
  const src = new Client({ connectionString: SRC });
  const tgt = new Client({ connectionString: TGT });
  await src.connect();
  await tgt.connect();

  // sanity
  const chk = await tgt.query(
    "SELECT 1 FROM branches WHERE id=$1 AND business_id=$2",
    [BRANCH_ID, BUSINESS_ID],
  );
  if (!chk.rowCount) throw new Error("LebuCafe branch/business not found in target.");

  // read source (return [] for absent tables)
  const read = async (t) => {
    try {
      return (await src.query(`SELECT * FROM ${t}`)).rows;
    } catch {
      return [];
    }
  };
  const S = {};
  for (const t of [
    "users", "dining_tables", "main_categories", "categories", "menu_items",
    "menu_item_categories", "payment_methods", "inventory_items", "stock_locations",
    "inventory_stock", "recipes", "recipe_ingredients", "organizations", "orders",
    "order_items", "payments", "org_credit_payments", "org_credit_transactions",
    "stock_transfers", "stock_transfer_items", "stock_movements", "system_settings",
  ]) {
    S[t] = await read(t);
    console.log(`read ${t}: ${S[t].length}`);
  }

  // ---- user reconciliation ----
  const tgtUsers = (
    await tgt.query(
      "SELECT id, username, branch_id FROM users WHERE business_id=$1",
      [BUSINESS_ID],
    )
  ).rows;
  // match within branch (branch users) by username
  const tgtByName = new Map(tgtUsers.map((u) => [u.username, u.id]));
  const userMap = new Map();
  const newUsers = [];
  for (const u of S.users) {
    const existing = tgtByName.get(u.username);
    if (existing) {
      userMap.set(u.id, existing); // reuse account
    } else {
      const nu = randomUUID();
      userMap.set(u.id, nu);
      newUsers.push(u);
    }
  }
  console.log(
    `users: ${S.users.length} source, reused ${S.users.length - newUsers.length} (${S.users.filter((u) => tgtByName.has(u.username)).map((u) => u.username).join(",")}), creating ${newUsers.length} (${newUsers.map((u) => u.username).join(",")})`,
  );

  // ---- id -> uuid maps for everything else ----
  const mk = (rows) => {
    const m = new Map();
    rows.forEach((r) => m.set(r.id, randomUUID()));
    return m;
  };
  const diningMap = mk(S.dining_tables);
  const mainCatMap = mk(S.main_categories);
  const catMap = mk(S.categories);
  const menuMap = mk(S.menu_items);
  const pmMap = mk(S.payment_methods);
  const invMap = mk(S.inventory_items);
  const locMap = mk(S.stock_locations);
  const stockMap = mk(S.inventory_stock);
  const recipeMap = mk(S.recipes);
  const riMap = mk(S.recipe_ingredients);
  const orgMap = mk(S.organizations);
  const orderMap = mk(S.orders);
  const oiMap = mk(S.order_items);
  const payMap = mk(S.payments);
  const ocpMap = mk(S.org_credit_payments);
  const octMap = mk(S.org_credit_transactions);
  const transferMap = mk(S.stock_transfers);
  const stiMap = mk(S.stock_transfer_items);
  const smMap = mk(S.stock_movements);

  const r = (map, v) => (v == null ? null : map.get(v) ?? null);
  const ru = (v) => (v == null ? null : userMap.get(v) ?? null);
  const tc = { business_id: BUSINESS_ID, branch_id: BRANCH_ID };

  const newUserRows = newUsers.map((u) => ({
    id: userMap.get(u.id),
    ...tc,
    name: u.name,
    username: u.username,
    password_hash: u.password_hash,
    pin_hash: u.pin_hash,
    role: u.role,
    role_id: null,
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone,
    is_active: u.is_active,
    cancel_password: u.cancel_password,
    print_copies: u.print_copies,
    meta: u.meta,
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));

  const diningRows = S.dining_tables.map((d) => ({
    id: diningMap.get(d.id), ...tc, table_number: d.table_number, status: d.status,
    created_at: d.created_at, updated_at: d.updated_at,
  }));
  const mainCatRows = S.main_categories.map((c) => ({
    id: mainCatMap.get(c.id), ...tc, name: c.name, slug: c.slug, display_order: c.display_order,
    is_active: c.is_active, created_at: c.created_at, updated_at: c.updated_at,
  }));
  const catRows = S.categories.map((c) => ({
    id: catMap.get(c.id), ...tc, name: c.name, slug: c.slug, icon: c.icon,
    display_order: c.display_order, type: c.type, is_active: c.is_active, meta: c.meta,
    created_at: c.created_at, updated_at: c.updated_at,
  }));
  const menuRows = S.menu_items.map((m) => ({
    id: menuMap.get(m.id), ...tc, name: m.name, description: m.description, price: m.price,
    category: m.category, main_category: m.main_category, type: m.type, is_available: m.is_available,
    image_url: m.image_url, prep_time_minutes: m.prep_time_minutes, sku: m.sku, barcode: m.barcode,
    meta: m.meta, created_at: m.created_at, updated_at: m.updated_at,
  }));
  const micRows = S.menu_item_categories.map((m) => ({
    ...tc, menu_item_id: r(menuMap, m.menu_item_id), category_id: r(catMap, m.category_id),
    created_at: m.created_at,
  }));
  const pmRows = S.payment_methods.map((p) => ({
    id: pmMap.get(p.id), ...tc, name: p.name, display_name: p.display_name, icon: p.icon,
    description: p.description, is_active: p.is_active, created_at: p.created_at, updated_at: p.updated_at,
  }));
  const invRows = S.inventory_items.map((i) => ({
    id: invMap.get(i.id), ...tc, name: i.name, unit: i.unit, base_unit: i.base_unit,
    pieces_per_unit: i.pieces_per_unit, min_quantity: i.min_quantity, min_quantity_mode: i.min_quantity_mode,
    notes: i.notes, meta: i.meta, created_at: i.created_at, updated_at: i.updated_at,
  }));
  const locRows = S.stock_locations.map((l) => ({
    id: locMap.get(l.id), ...tc, name: l.name, slug: l.slug, description: l.description,
    location_type: l.location_type, is_default: l.is_default, is_active: l.is_active,
    display_order: l.display_order, linked_main_category_slug: l.linked_main_category_slug,
    meta: l.meta, version: l.version, deleted_at: l.deleted_at, created_at: l.created_at, updated_at: l.updated_at,
  }));
  const stockRows = S.inventory_stock.map((s) => ({
    id: stockMap.get(s.id), ...tc, inventory_item_id: r(invMap, s.inventory_item_id),
    location_id: r(locMap, s.location_id), quantity: s.quantity, min_quantity: s.min_quantity,
  }));
  const recipeRows = S.recipes.map((rc) => ({
    id: recipeMap.get(rc.id), ...tc, menu_item_id: r(menuMap, rc.menu_item_id), name: rc.name,
    yield_quantity: rc.yield_quantity, deduct_from_location_id: r(locMap, rc.deduct_from_location_id),
    deduct_strategy: rc.deduct_strategy, is_active: rc.is_active, meta: rc.meta,
    created_at: rc.created_at, updated_at: rc.updated_at,
  }));
  const riRows = S.recipe_ingredients.map((ri) => ({
    id: riMap.get(ri.id), ...tc, recipe_id: r(recipeMap, ri.recipe_id),
    inventory_item_id: r(invMap, ri.inventory_item_id), quantity: ri.quantity, waste_factor: ri.waste_factor,
    is_optional: ri.is_optional, notes: ri.notes, display_order: ri.display_order,
  }));
  const orgRows = S.organizations.map((o) => ({
    id: orgMap.get(o.id), ...tc, name: o.name, contact_name: o.contact_name, phone: o.phone,
    email: o.email, address: o.address, notes: o.notes, is_active: o.is_active,
    credit_balance: o.credit_balance, meta: o.meta, version: o.version, deleted_at: o.deleted_at,
    created_at: o.created_at, updated_at: o.updated_at,
  }));
  const orderRows = S.orders.map((o) => ({
    id: orderMap.get(o.id), ...tc, order_number: null, customer_id: o.customer_id,
    organization_id: r(orgMap, o.organization_id), is_price_override: o.is_price_override,
    employee_id: ru(o.employee_id), table_number: o.table_number, waiter_id: ru(o.waiter_id),
    cashier_id: ru(o.cashier_id), type: o.type, status: o.status, payment_status: o.payment_status,
    total_amount: o.total_amount, total_cents: o.total_cents, notes: o.notes, meta: o.meta,
    created_at: o.created_at, updated_at: o.updated_at,
  }));
  const oiRows = S.order_items.map((oi) => ({
    id: oiMap.get(oi.id), ...tc, order_id: r(orderMap, oi.order_id), menu_item_id: r(menuMap, oi.menu_item_id),
    menu_id: r(menuMap, oi.menu_id), quantity: oi.quantity, unit_price: oi.unit_price,
    unit_price_cents: oi.unit_price_cents, subtotal: oi.subtotal, item_type: oi.item_type,
    main_category: oi.main_category, created_at: oi.created_at,
  }));
  const payRows = S.payments.map((p) => ({
    id: payMap.get(p.id), ...tc, order_id: r(orderMap, p.order_id), amount_cents: p.amount_cents,
    amount: p.amount, method: p.method, payment_method: p.payment_method, status: p.status,
    processed_by: ru(p.processed_by), description: p.description, qr_code: p.qr_code, paid_at: p.paid_at,
    meta: p.meta, created_at: p.created_at, updated_at: p.updated_at,
  }));
  const ocpRows = S.org_credit_payments.map((p) => ({
    id: ocpMap.get(p.id), ...tc, organization_id: r(orgMap, p.organization_id), amount: p.amount,
    payment_date: p.payment_date, notes: p.notes, created_at: p.created_at, updated_at: p.updated_at,
  }));
  const octRows = S.org_credit_transactions.map((t) => ({
    id: octMap.get(t.id), ...tc, organization_id: r(orgMap, t.organization_id),
    payment_id: r(ocpMap, t.payment_id), transaction_date: t.transaction_date, notes: t.notes,
    services: t.services, total_amount: t.total_amount, created_at: t.created_at, updated_at: t.updated_at,
  }));
  const transferRows = S.stock_transfers.map((t) => ({
    id: transferMap.get(t.id), ...tc, from_location: t.from_location, to_location: t.to_location,
    from_location_id: r(locMap, t.from_location_id), to_location_id: r(locMap, t.to_location_id),
    status: t.status, notes: t.notes, created_by: ru(t.created_by), received_by: ru(t.received_by),
    received_at: t.received_at, meta: t.meta, created_at: t.created_at, updated_at: t.updated_at,
  }));
  const stiRows = S.stock_transfer_items.map((s) => ({
    id: stiMap.get(s.id), ...tc, transfer_id: r(transferMap, s.transfer_id),
    inventory_item_id: r(invMap, s.inventory_item_id), quantity: s.quantity, meta: s.meta, created_at: s.created_at,
  }));
  const smRows = S.stock_movements.map((sm) => ({
    id: smMap.get(sm.id), ...tc, inventory_item_id: r(invMap, sm.inventory_item_id),
    movement_type: sm.movement_type, location: sm.location, location_id: r(locMap, sm.location_id),
    quantity_delta: sm.quantity_delta, quantity_after: sm.quantity_after, transfer_id: r(transferMap, sm.transfer_id),
    order_id: r(orderMap, sm.order_id), order_item_id: r(oiMap, sm.order_item_id), notes: sm.notes,
    created_by: ru(sm.created_by), meta: sm.meta, created_at: sm.created_at,
  }));
  const settingsRows = S.system_settings.map((s) => ({
    ...tc, key: s.key, value: s.value, updated_at: s.updated_at,
  }));

  const plan = {
    delete_then_import: true,
    new_users: newUserRows.length, dining: diningRows.length, main_categories: mainCatRows.length,
    categories: catRows.length, payment_methods: pmRows.length, inventory_items: invRows.length,
    stock_locations: locRows.length, menu_items: menuRows.length, menu_item_categories: micRows.length,
    recipes: recipeRows.length, recipe_ingredients: riRows.length, inventory_stock: stockRows.length,
    organizations: orgRows.length, orders: orderRows.length, order_items: oiRows.length,
    payments: payRows.length, stock_movements: smRows.length,
  };
  console.log("\nplan:", plan);

  if (DRY) {
    console.log("\nDRY run — no writes.");
    await src.end();
    await tgt.end();
    return;
  }

  async function ins(table, cols, rows) {
    if (!rows.length) return console.log(`  + ${table}: 0 (skipped)`);
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
    console.log(`  + ${table}: ${rows.length}`);
  }

  await tgt.query("BEGIN");
  try {
    // 1. delete junk for this branch (FK-dependency order); KEEP users.
    const del = async (t) => {
      const res = await tgt.query(`DELETE FROM ${t} WHERE business_id=$1`, [BUSINESS_ID]);
      console.log(`  - ${t}: ${res.rowCount}`);
    };
    for (const t of [
      "stock_movements", "stock_transfer_items", "stock_transfers", "payments", "order_items",
      "orders", "org_credit_transactions", "org_credit_payments", "menu_item_categories",
      "recipe_ingredients", "recipes", "inventory_stock", "menu_items", "categories",
      "main_categories", "payment_methods", "inventory_items", "stock_locations",
      "dining_tables", "organizations", "system_settings",
    ]) {
      await del(t);
    }

    // 2. insert new users
    await ins("users", ["id", "business_id", "branch_id", "name", "username", "password_hash", "pin_hash", "role", "role_id", "first_name", "last_name", "phone", "is_active", "cancel_password", "print_copies", "meta", "created_at", "updated_at"], newUserRows);

    // 3. import dimensions + operational
    await ins("dining_tables", ["id", "business_id", "branch_id", "table_number", "status", "created_at", "updated_at"], diningRows);
    await ins("main_categories", ["id", "business_id", "branch_id", "name", "slug", "display_order", "is_active", "created_at", "updated_at"], mainCatRows);
    await ins("categories", ["id", "business_id", "branch_id", "name", "slug", "icon", "display_order", "type", "is_active", "meta", "created_at", "updated_at"], catRows);
    await ins("payment_methods", ["id", "business_id", "branch_id", "name", "display_name", "icon", "description", "is_active", "created_at", "updated_at"], pmRows);
    await ins("inventory_items", ["id", "business_id", "branch_id", "name", "unit", "base_unit", "pieces_per_unit", "min_quantity", "min_quantity_mode", "notes", "meta", "created_at", "updated_at"], invRows);
    await ins("stock_locations", ["id", "business_id", "branch_id", "name", "slug", "description", "location_type", "is_default", "is_active", "display_order", "linked_main_category_slug", "meta", "version", "deleted_at", "created_at", "updated_at"], locRows);
    await ins("menu_items", ["id", "business_id", "branch_id", "name", "description", "price", "category", "main_category", "type", "is_available", "image_url", "prep_time_minutes", "sku", "barcode", "meta", "created_at", "updated_at"], menuRows);
    await ins("menu_item_categories", ["business_id", "branch_id", "menu_item_id", "category_id", "created_at"], micRows);
    await ins("recipes", ["id", "business_id", "branch_id", "menu_item_id", "name", "yield_quantity", "deduct_from_location_id", "deduct_strategy", "is_active", "meta", "created_at", "updated_at"], recipeRows);
    await ins("recipe_ingredients", ["id", "business_id", "branch_id", "recipe_id", "inventory_item_id", "quantity", "waste_factor", "is_optional", "notes", "display_order"], riRows);
    await ins("inventory_stock", ["id", "business_id", "branch_id", "inventory_item_id", "location_id", "quantity", "min_quantity"], stockRows);
    await ins("organizations", ["id", "business_id", "branch_id", "name", "contact_name", "phone", "email", "address", "notes", "is_active", "credit_balance", "meta", "version", "deleted_at", "created_at", "updated_at"], orgRows);
    await ins("orders", ["id", "business_id", "branch_id", "order_number", "customer_id", "organization_id", "is_price_override", "employee_id", "table_number", "waiter_id", "cashier_id", "type", "status", "payment_status", "total_amount", "total_cents", "notes", "meta", "created_at", "updated_at"], orderRows);
    await ins("order_items", ["id", "business_id", "branch_id", "order_id", "menu_item_id", "menu_id", "quantity", "unit_price", "unit_price_cents", "subtotal", "item_type", "main_category", "created_at"], oiRows);
    await ins("payments", ["id", "business_id", "branch_id", "order_id", "amount_cents", "amount", "method", "payment_method", "status", "processed_by", "description", "qr_code", "paid_at", "meta", "created_at", "updated_at"], payRows);
    await ins("org_credit_payments", ["id", "business_id", "branch_id", "organization_id", "amount", "payment_date", "notes", "created_at", "updated_at"], ocpRows);
    await ins("org_credit_transactions", ["id", "business_id", "branch_id", "organization_id", "payment_id", "transaction_date", "notes", "services", "total_amount", "created_at", "updated_at"], octRows);
    await ins("stock_transfers", ["id", "business_id", "branch_id", "from_location", "to_location", "from_location_id", "to_location_id", "status", "notes", "created_by", "received_by", "received_at", "meta", "created_at", "updated_at"], transferRows);
    await ins("stock_transfer_items", ["id", "business_id", "branch_id", "transfer_id", "inventory_item_id", "quantity", "meta", "created_at"], stiRows);
    await ins("stock_movements", ["id", "business_id", "branch_id", "inventory_item_id", "movement_type", "location", "location_id", "quantity_delta", "quantity_after", "transfer_id", "order_id", "order_item_id", "notes", "created_by", "meta", "created_at"], smRows);
    await ins("system_settings", ["business_id", "branch_id", "key", "value", "updated_at"], settingsRows);

    await tgt.query("COMMIT");
    console.log(`\nCOMMITTED lebu_cafe_1 -> LebuCafe Branch1 ${BRANCH_ID}.`);
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
