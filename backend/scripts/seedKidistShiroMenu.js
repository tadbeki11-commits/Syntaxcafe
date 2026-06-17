/*
 * Seed the menu for "Kidist shiro" into the multi-tenant DB.
 *
 * This business has TWO branches (Branch1, Branch2). The same menu is seeded
 * into BOTH branches.
 *
 * - Creates 5 menu categories (type='main', POS tabs): Breakfast, Extras,
 *   Fasting Lunch, Non-Fasting Lunch, Drinks
 * - Creates 3 main_categories used as PRINTING DEPARTMENTS: Foods, Drinks,
 *   Hot Drinks. The receipt printer routes each item to a printer by its
 *   main_category (see resolveItemCategory in app/src/.../orders.adapter.ts),
 *   so main_category = printing department here.
 * - Inserts menu items with name=Amharic, description=English, type='cafe'
 *   (so getCafeMenu() picks them up), and links each to its category via
 *   menu_item_categories.
 *
 * Idempotent: skips any menu item that already exists for the branch by
 * (name, category), and upserts categories on (branch_id, slug). Safe to
 * re-run. Dedup is by name+category (not name alone) because several Amharic
 * names repeat across sections at different prices (e.g. እንጀራ ፍርፍር,
 * ድርቆሽ ፍርፍር, ስፔሻል ሽሮ, ማህበራዊ, ½ አገልግሎት, ስፔሻል አገልግሎት).
 *
 * Usage:
 *   DATABASE_URL="postgres://.../postgres" node scripts/seedKidistShiroMenu.js
 *   (optional: DRY=1 to print the plan without writing)
 */
const { Client } = require("pg");
const { randomUUID } = require("crypto");

const TGT =
  process.env.DATABASE_URL ||
  "postgres://postgres:gPKqP7qCW0Ll7UgrIegcyoCXFl75DgT3lA0f29Obv4GYuI1gmJNxJxGFX9nvRYla@37.60.230.104:5450/postgres";

const BIZ_SLUG = "kidist-shiro";
const DRY = process.env.DRY === "1";

// Menu categories (type='main') shown as POS tabs.
const CATEGORIES = [
  { name: "Breakfast", slug: "breakfast", display_order: 0 },
  { name: "Extras", slug: "extras", display_order: 1 },
  { name: "Fasting Lunch", slug: "fasting-lunch", display_order: 2 },
  { name: "Non-Fasting Lunch", slug: "non-fasting-lunch", display_order: 3 },
  { name: "Drinks", slug: "drinks", display_order: 4 },
];

// Printing departments (stored as main_category). The receipt printer routes
// each line to a printer keyed by this value.
const MAIN_CATEGORIES = [
  { name: "Foods", slug: "foods", display_order: 0 },
  { name: "Drinks", slug: "drinks", display_order: 1 },
  { name: "Hot Drinks", slug: "hot-drinks", display_order: 2 },
];

// category = category slug, main_category = main_category slug.
const it = (am, en, price, category, main_category) => ({
  name: am,
  description: en,
  price: String(price),
  category,
  main_category,
});

// POS category tabs (categories.slug)
const BREAKFAST = "breakfast";
const EXTRAS = "extras";
const FAST_LUNCH = "fasting-lunch";
const NF_LUNCH = "non-fasting-lunch";
const DRINKS = "drinks";

// Printing departments (main_category)
const FOODS = "foods";
const DRINKS_DEPT = "drinks";
const HOT = "hot-drinks";

const ITEMS = [
  // --- ቁርስ Breakfast (dept: foods) ---
  it("የበግ ዱለት", "Lamb Dulet", 450, BREAKFAST, FOODS),
  it("ኖርማል ዱለት", "Normal Dulet", 400, BREAKFAST, FOODS),
  it("ጋዝ ላይት", "Gaz Light", 400, BREAKFAST, FOODS),
  it("ፉል", "Foul", 250, BREAKFAST, FOODS),
  it("ፈታ", "Feta", 250, BREAKFAST, FOODS),
  it("የቀይ ጤፍ ጨጨብሳ", "Chechebsa with Red Teff", 300, BREAKFAST, FOODS),
  it("እንጀራ ፍርፍር", "Injera Firfir", 300, BREAKFAST, FOODS),
  it("ስፔሻል ፈታ", "Special Feta", 300, BREAKFAST, FOODS),
  it("እንቁላል ፍርፍር", "Scrambled Eggs", 250, BREAKFAST, FOODS),
  it("ድርቆሽ ፍርፍር", "Dirkosh Firfir", 300, BREAKFAST, FOODS),
  it("ድርቆሽ በስጋ", "Dirkosh with Meat", 350, BREAKFAST, FOODS),
  it("ጥብስ ፍርፍር", "Tibs Firfir", 400, BREAKFAST, FOODS),
  it("ቋንጣ ፍርፍር", "Kwanza Firfir", 450, BREAKFAST, FOODS),
  it("ስፔሻል ፍርፍር", "Special Firfir", 350, BREAKFAST, FOODS),
  it("ቡላ", "Bula", 300, BREAKFAST, FOODS),

  // --- ጫማሪ Extras (dept: foods) ---
  it("ዳቦ", "Bread", 20, EXTRAS, FOODS),
  it("እንጀራ", "Injera", 30, EXTRAS, FOODS),
  it("ቅቤ", "Butter", 30, EXTRAS, FOODS),
  it("እንቁላል", "Egg", 40, EXTRAS, FOODS),

  // --- የጾም ምሳ Fasting / Vegan Lunch (dept: foods) ---
  it("ሽሮ", "Shiro", 300, FAST_LUNCH, FOODS),
  it("በየአይነት", "Beyaynetu (Combo Veggie Platter)", 340, FAST_LUNCH, FOODS),
  it("ተጋቢኖ", "Tegabino Shiro", 340, FAST_LUNCH, FOODS),
  it("ማህበራዊ", "Mahberawi", 530, FAST_LUNCH, FOODS),
  it("ስፔሻል አገልግሎት", "Special Agelgilot", 980, FAST_LUNCH, FOODS),
  it("½ አገልግሎት", "Half Agelgilot", 480, FAST_LUNCH, FOODS),
  it("ሱፍ ፍትፍት", "Suf Fitfit", 320, FAST_LUNCH, FOODS),
  it("ተልባ ፍትፍት", "Telba Fitfit", 320, FAST_LUNCH, FOODS),
  it("ፓስታ በስጎ/በአትክልት", "Pasta with Sauce/Veg", 320, FAST_LUNCH, FOODS),
  it("ድቅድቅ ወጥ", "Dikdik Wot", 350, FAST_LUNCH, FOODS),
  it("ስፔሻል ሽሮ", "Special Shiro", 350, FAST_LUNCH, FOODS),
  it("ጎመን ጥብስ", "Gomen Tibs", 320, FAST_LUNCH, FOODS),
  it("ቲማቲም", "Tomato Salad", 270, FAST_LUNCH, FOODS),
  it("ድርቆሽ ፍርፍር", "Dry Dirkosh Firfir", 320, FAST_LUNCH, FOODS),
  it("እንጀራ ፍርፍር", "Injera Firfir", 320, FAST_LUNCH, FOODS),
  it("ሰላጣ", "Salad", 300, FAST_LUNCH, FOODS),
  it("Combo (ሱፍ፣ ሰሊጥ፣ ተልባ፣ ሽሮ)", "Combo (Suf, Selit, Telba, Shiro)", 350, FAST_LUNCH, FOODS),
  it("ዓሳ ለብለብ", "Asa Lebleb (Fish)", 500, FAST_LUNCH, FOODS),
  it("ዓሳ", "Fish", 500, FAST_LUNCH, FOODS),
  it("ዓሳ ጉላሽ", "Fish Goulash", 500, FAST_LUNCH, FOODS),
  it("ጎመን ክትፎ", "Gomen Kitfo", 400, FAST_LUNCH, FOODS),
  it("ሃና ሃና", "Hana Hana", 350, FAST_LUNCH, FOODS),

  // --- የፍስክ ምሳ Non-Fasting / Meat Lunch (dept: foods) ---
  it("የበከል ጥብስ", "Bekel Tibs", 750, NF_LUNCH, FOODS),
  it("የበግ ጥብስ", "Lamb Tibs", 650, NF_LUNCH, FOODS),
  it("ኖርማል ጥብስ", "Normal Tibs", 550, NF_LUNCH, FOODS),
  it("ቅቅል", "Kikil (Boiled Meat Broth)", 600, NF_LUNCH, FOODS),
  it("ቀይ ወጥ", "Key Wot (Spicy Beef Stew)", 500, NF_LUNCH, FOODS),
  it("ጎመን በስጋ", "Gomen with Meat", 450, NF_LUNCH, FOODS),
  it("ድንች በስጋ", "Potato with Meat", 400, NF_LUNCH, FOODS),
  it("ቅድስት ስፔሻል", "Kidist Special", 1050, NF_LUNCH, FOODS),
  it("ማህበራዊ", "Mahberawi (Mixed Meat Platter)", 650, NF_LUNCH, FOODS),
  it("ምንቸት", "Minchet Abish", 400, NF_LUNCH, FOODS),
  it("ሚኒቶ", "Mineto", 400, NF_LUNCH, FOODS),
  it("½ አገልግሎት", "Half Agelgilot", 800, NF_LUNCH, FOODS),
  it("ስፔሻል አገልግሎት", "Special Agelgilot", 1550, NF_LUNCH, FOODS),
  it("ቦዘና", "Bozena Shiro", 400, NF_LUNCH, FOODS),
  it("ስፔሻል ሽሮ", "Special Shiro", 450, NF_LUNCH, FOODS),

  // --- መጠጦች Drinks: ትኩስ Hot (dept: hot-drinks) ---
  it("የጅብና ቡና", "Traditional Jebena Coffee", 50, DRINKS, HOT),
  it("የስቲም ቡና", "Macchiato (Steam Coffee)", 60, DRINKS, HOT),
  it("ሻይ", "Tea", 40, DRINKS, HOT),

  // --- መጠጦች Drinks: ቀዝቃዛ Cold (dept: drinks) ---
  it("ውሃ 2 ሊትር", "Water 2L", 80, DRINKS, DRINKS_DEPT),
  it("ውሃ 1 ሊትር", "Water 1L", 60, DRINKS, DRINKS_DEPT),
  it("ውሃ ½ ሊትር", "Water 0.5L", 40, DRINKS, DRINKS_DEPT),
  it("ለስላሳ", "Soft Drinks", 60, DRINKS, DRINKS_DEPT),
  it("ቢራ", "Beer", 100, DRINKS, DRINKS_DEPT),
  it("ሲንጋል", "Singha (St. George)", 45, DRINKS, DRINKS_DEPT),
  it("ጆንቦ", "Jumbo Beer", 80, DRINKS, DRINKS_DEPT),
  it("ተክሸኖ", "Tequila (Local Spirits)", 1200, DRINKS, DRINKS_DEPT),
  it("አክሱማይት", "Axumite Wine", 1300, DRINKS, DRINKS_DEPT),
  it("ካሚላ", "Kamila", 1500, DRINKS, DRINKS_DEPT),
  it("አዋሽ ሮዝ", "Awash Rosé Wine", 1800, DRINKS, DRINKS_DEPT),
  it("አዋሽ ስፔሻል", "Awash Special Wine", 2000, DRINKS, DRINKS_DEPT),
  it("ጎርደን", "Gordons Gin", 900, DRINKS, DRINKS_DEPT),
  it("ጂን", "Gin", 100, DRINKS, DRINKS_DEPT),
  it("ሐረሽ አረቄ", "Haresh Areke", 60, DRINKS, DRINKS_DEPT),
  it("ሄኔከን", "Heineken", 120, DRINKS, DRINKS_DEPT),

  // --- መጠጦች Drinks: ስፔሻል Special / Juices (dept: drinks) ---
  it("ሱፍ", "Suf Juice (Sunflower Drink)", 200, DRINKS, DRINKS_DEPT),
  it("ተልባ", "Telba Drink (Flaxseed)", 150, DRINKS, DRINKS_DEPT),
  it("እርጎ", "Yogurt", 150, DRINKS, DRINKS_DEPT),
  it("ካሮት ጁስ", "Carrot Juice", 200, DRINKS, DRINKS_DEPT),
  it("ቀይስር ጁስ", "Beetroot Juice", 150, DRINKS, DRINKS_DEPT),
];

async function seedBranch(tgt, businessId, branchId, branchName, catId) {
  const tc = { business_id: businessId, branch_id: branchId };

  // 1. Upsert categories (type='main') for this branch.
  catId.clear();
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

  // 2. Upsert main_categories.
  for (const m of MAIN_CATEGORIES) {
    await tgt.query(
      `INSERT INTO main_categories (id, business_id, branch_id, name, slug, display_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (branch_id, slug) DO UPDATE SET name=EXCLUDED.name, display_order=EXCLUDED.display_order, is_active=true, updated_at=now()`,
      [randomUUID(), tc.business_id, tc.branch_id, m.name, m.slug, m.display_order],
    );
  }

  // 3. Insert menu items + join rows (skip if (name, category) already exists for branch).
  let created = 0;
  let skipped = 0;
  for (const item of ITEMS) {
    const exists = await tgt.query(
      "SELECT 1 FROM menu_items WHERE branch_id=$1 AND name=$2 AND category=$3 LIMIT 1",
      [tc.branch_id, item.name, item.category],
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

  console.log(
    `  Branch ${branchName} (${branchId}): created ${created}, skipped ${skipped}.`,
  );
}

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

    console.log(
      `Target: ${biz.rows[0].name} (${businessId}) — ${br.rowCount} branch(es).`,
    );
    console.log(
      `Plan per branch: ${CATEGORIES.length} categories, ${MAIN_CATEGORIES.length} main_categories, ${ITEMS.length} menu items.`,
    );

    if (DRY) {
      console.log("DRY run — no writes.");
      return;
    }

    await tgt.query("BEGIN");
    const catId = new Map();
    for (const b of br.rows) {
      await seedBranch(tgt, businessId, b.id, b.name, catId);
    }
    await tgt.query("COMMIT");
    console.log("\nCOMMITTED.");
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
