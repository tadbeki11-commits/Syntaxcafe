/*
 * Seed the menu for "Southern Terfe Hotel" (single branch) into the multi-tenant DB.
 *
 * - Creates 3 menu categories (type='main'): Main Dishes, Drinks, Fasting Dishes
 * - Creates 2 main_categories (top-level grouping): Non-Fasting, Fasting
 * - Inserts menu items with name=Amharic, description=English, type='cafe'
 *   (so getCafeMenu() picks them up), and links each to its category via
 *   menu_item_categories.
 *
 * Idempotent: skips any menu item that already exists for the branch by name,
 * and upserts categories on (branch_id, slug). Safe to re-run.
 *
 * Usage:
 *   DATABASE_URL="postgres://.../postgres" node scripts/seedSouthernTerfeMenu.js
 *   (optional: DRY=1 to print the plan without writing)
 */
const { Client } = require("pg");
const { randomUUID } = require("crypto");

const TGT =
  process.env.DATABASE_URL ||
  "postgres://postgres:gPKqP7qCW0Ll7UgrIegcyoCXFl75DgT3lA0f29Obv4GYuI1gmJNxJxGFX9nvRYla@37.60.230.104:5450/postgres";

const BIZ_SLUG = "southern-terfe-hotel";
const DRY = process.env.DRY === "1";

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

// Menu categories (type='main') shown as POS tabs.
const CATEGORIES = [
  { name: "Main Dishes", slug: "main-dishes", display_order: 0 },
  { name: "Drinks", slug: "drinks", display_order: 1 },
  { name: "Fasting Dishes", slug: "fasting-dishes", display_order: 2 },
];

// Top-level groupings.
const MAIN_CATEGORIES = [
  { name: "Non-Fasting", slug: "non-fasting", display_order: 0 },
  { name: "Fasting", slug: "fasting", display_order: 1 },
];

// category = category slug, main_category = main_category slug.
const it = (am, en, price, category, main_category) => ({
  name: am,
  description: en,
  price: String(price),
  category,
  main_category,
});

const MAIN = "main-dishes";
const DRINKS = "drinks";
const FAST = "fasting-dishes";
const NF = "non-fasting";
const F = "fasting";

const ITEMS = [
  // --- Main dishes (Non-Fasting) ---
  it("1 ኪሎ ስጋ", "1 Kg Meat (Siga)", 2000, MAIN, NF),
  it("1/2 ኪሎ ስጋ", "1/2 Kg Meat (Siga)", 1000, MAIN, NF),
  it("1/4 ኪሎ ስጋ", "1/4 Kg Meat (Siga)", 500, MAIN, NF),
  it("አስገኝቶ ክትፎ", "Kitfo (Special)", 1300, MAIN, NF),
  it("ዱለት", "Dulet", 400, MAIN, NF),
  it("ምላስ በጎርደን", "Tongue with Gordon", 400, MAIN, NF),
  it("1 ኪሎ ቅቅል", "1 Kg Qeqel (Boiled Meat)", 2400, MAIN, NF),
  it("½ ኪሎ ቅቅል", "1/2 Kg Qeqel (Boiled Meat)", 1200, MAIN, NF),

  // --- Drinks & others (Non-Fasting) ---
  it("ናሽናል ቢራ", "National Beer", 110, DRINKS, NF),
  it("ስፔሻል ቢራ", "Special Beer", 125, DRINKS, NF),
  it("ረድኑላህ ወይን", "Rednuallah Wine", 2000, DRINKS, NF),
  it("አካዲያ ወይን", "Arcadia Wine", 2000, DRINKS, NF),
  it("ትልቅ አፐዢ", "Large Aperitif", 800, DRINKS, NF),
  it("ትንሽ አፐዢ", "Small Aperitif", 500, DRINKS, NF),
  it("ትልቅ ጐደር", "Large Gonder (Liquor)", 800, DRINKS, NF),
  it("ትንሽ ጐደር", "Small Gonder (Liquor)", 500, DRINKS, NF),
  it("ጎርደን", "Gordon's", 10000, DRINKS, NF),
  it("ብላክ ሌብል", "Black Label", 16000, DRINKS, NF),
  it("ሬድ ሌብል", "Red Label", 20000, DRINKS, NF),
  it("ጆርጅስ ሲንገል", "George's Single", 70, DRINKS, NF),
  it("ሄንክስ ሲንገል", "Hank's Single", 85, DRINKS, NF),
  it("ለስላሳ", "Soft Drink (Soda)", 70, DRINKS, NF),
  it("2 ሊትር ውሃ", "2 Liter Water", 70, DRINKS, NF),
  it("1 ሊትር ውሃ", "1 Liter Water", 60, DRINKS, NF),
  it("0.5 ሊትር ውሃ", "0.5 Liter Water", 40, DRINKS, NF),
  it("ሻይ", "Tea", 40, DRINKS, NF),
  it("ማኪያቶ", "Macchiato", 45, DRINKS, NF),
  it("አፕል ቲክስኖ", "Apple Tixno", 850, DRINKS, NF),
  it("ሼክ", "Shake", 2000, DRINKS, NF),

  // --- Fasting dishes ---
  it("እህል በየአይነቱ", "Beyaynetu (Assorted Fasting Platters)", 400, FAST, F),
  it("እህል ሸሮባ", "Shiro Wot (Chickpea Stew)", 400, FAST, F),
  it("እንጉዳይ", "Enguday (Mushroom dish)", 550, FAST, F),
  it("እህ እስካሎፕ", "Fasting Cutlet / Escalope", 550, FAST, F),
  it("እህ ክትፎ", "Fasting Kitfo", 550, FAST, F),
  it("እህ ጥብስ", "Fasting Tibs", 550, FAST, F),
  it("ሰላጣ", "Salad", 400, FAST, F),
  it("እህ ኮምቦ", "Fasting Tomato dish / Combo", 1200, FAST, F),
  it("እህ ጥብስ ሙሉ", "Full Fasting Tibs", 500, FAST, F),
  it("እህ ጥብስ ግማሽ", "Half Fasting Tibs", 250, FAST, F),
  it("በየአይነት", "Beyaynetu (Standard)", 300, FAST, F),
  it("ሸሮ", "Shiro", 250, FAST, F),
  it("ተጋቢኖ", "Tagabino (Thick Shiro)", 250, FAST, F),
  it("ጎመን ጥብስ", "Fried Gomen (Collard Greens)", 250, FAST, F),
  it("ጎመን ክትፎ", "Gomen Kitfo", 300, FAST, F),
  it("ጎመን ጥብስ ስፔሻል", "Gomen Tibs", 250, FAST, F),
  it("ፓስታ በስጎ", "Pasta with Tomato Sauce", 250, FAST, F),
  it("ፓስታ በአትክልት", "Pasta with Vegetables", 250, FAST, F),
  it("ሩዝ", "Rice (Ruz)", 250, FAST, F),
  it("እንጀራ", "Injera (Extra)", 40, FAST, F),
  it("ዳቦ", "Bread", 20, FAST, F),
  it("ስፔሻል ሸሮ", "Special Shiro", 300, FAST, F),
  it("ስፔሻል ሩዝ", "Special Rice", 300, FAST, F),
  it("አሳ ዱለት", "Fish Dulet", 400, FAST, F),
  it("ሱፍ ፍትፍት", "Suff Fitfit (Sunflower seed fitfit)", 250, FAST, F),
  it("ብሬ", "Bre", 400, FAST, F),
  it("ጥብስ አሳ", "Fried Fish (Tibs Asa)", 500, FAST, F),
];

async function main() {
  const tgt = new Client({ connectionString: TGT });
  await tgt.connect();

  try {
    const biz = await tgt.query("SELECT id, name FROM businesses WHERE slug=$1", [
      BIZ_SLUG,
    ]);
    if (!biz.rowCount) throw new Error(`Business '${BIZ_SLUG}' not found.`);
    const businessId = biz.rows[0].id;

    const br = await tgt.query(
      "SELECT id, name FROM branches WHERE business_id=$1 ORDER BY created_at NULLS FIRST",
      [businessId],
    );
    if (!br.rowCount) throw new Error("No branch found for business.");
    if (br.rowCount > 1)
      throw new Error(`Expected a single branch, found ${br.rowCount}.`);
    const branchId = br.rows[0].id;
    const tc = { business_id: businessId, branch_id: branchId };

    console.log(
      `Target: ${biz.rows[0].name} (${businessId}) / branch ${br.rows[0].name} (${branchId})`,
    );
    console.log(
      `Plan: ${CATEGORIES.length} categories, ${MAIN_CATEGORIES.length} main_categories, ${ITEMS.length} menu items.`,
    );

    if (DRY) {
      console.log("DRY run — no writes.");
      return;
    }

    await tgt.query("BEGIN");

    // 1. Upsert categories (type='main'); collect slug -> id
    const catId = new Map();
    for (const c of CATEGORIES) {
      const { rows } = await tgt.query(
        `INSERT INTO categories (id, business_id, branch_id, name, slug, display_order, type, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,'main',true)
         ON CONFLICT (branch_id, slug) DO UPDATE SET name=EXCLUDED.name, display_order=EXCLUDED.display_order, type='main', is_active=true, updated_at=now()
         RETURNING id`,
        [randomUUID(), tc.business_id, tc.branch_id, c.name, c.slug, c.display_order],
      );
      catId.set(c.slug, rows[0].id);
    }

    // 2. Upsert main_categories
    for (const m of MAIN_CATEGORIES) {
      await tgt.query(
        `INSERT INTO main_categories (id, business_id, branch_id, name, slug, display_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,true)
         ON CONFLICT (branch_id, slug) DO UPDATE SET name=EXCLUDED.name, display_order=EXCLUDED.display_order, is_active=true, updated_at=now()`,
        [randomUUID(), tc.business_id, tc.branch_id, m.name, m.slug, m.display_order],
      );
    }

    // 3. Insert menu items + join rows (skip if name already exists for branch)
    let created = 0;
    let skipped = 0;
    for (const item of ITEMS) {
      const exists = await tgt.query(
        "SELECT 1 FROM menu_items WHERE branch_id=$1 AND name=$2 LIMIT 1",
        [tc.branch_id, item.name],
      );
      if (exists.rowCount) {
        skipped++;
        continue;
      }

      const menuItemId = randomUUID();
      await tgt.query(
        `INSERT INTO menu_items (id, business_id, branch_id, name, description, price, category, main_category, type, is_available)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'cafe',true)`,
        [
          menuItemId,
          tc.business_id,
          tc.branch_id,
          item.name,
          item.description,
          item.price,
          item.category,
          item.main_category,
        ],
      );

      const categoryId = catId.get(item.category);
      if (categoryId) {
        await tgt.query(
          `INSERT INTO menu_item_categories (business_id, branch_id, menu_item_id, category_id)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [tc.business_id, tc.branch_id, menuItemId, categoryId],
        );
      }
      created++;
    }

    await tgt.query("COMMIT");
    console.log(`\nCOMMITTED. menu_items created: ${created}, skipped (already existed): ${skipped}.`);
  } catch (e) {
    await tgt.query("ROLLBACK").catch(() => {});
    console.error("ROLLED BACK:", e.message);
    throw e;
  } finally {
    await tgt.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
