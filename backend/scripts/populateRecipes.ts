/**
 * populateRecipes.ts
 *
 * Reads restaurant_recipe_dataset.json and populates the backend database with:
 *   1. Inventory items   – one row per unique ingredient name
 *   2. Recipes           – one row per menu item that has a recipe definition
 *   3. Recipe ingredients – links each recipe to its inventory item ingredients
 *
 * Safe to re-run: uses upsert / conflict-handling so duplicates are skipped.
 *
 * Usage:
 *   pnpm ts-node-dev --transpile-only scripts/populateRecipes.ts
 */

import fs from "fs";
import path from "path";
import { eq, and } from "drizzle-orm";
import { db, pool } from "../src/db/drizzle";
import {
  inventoryItems,
  menuItems,
  categories,
  menuItemCategories,
  recipes,
  recipeIngredients,
} from "../src/db/tables";
import { ensureDefaultTenant, tcols } from "./seedTenant";

// ── Types ────────────────────────────────────────────────────────────────────

interface DatasetIngredient {
  ingredient: string;
  qty: number;
  unit: string;
}

interface DatasetRecipe {
  item: string;
  price?: number;
  ingredients: DatasetIngredient[];
}

interface DatasetRoot {
  recipes: Record<string, DatasetRecipe[]>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u1200-\u137f]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Human-readable label from a dataset category key like "the_hot_beverages" */
function prettifyCategory(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve the base_unit from the unit string used in the dataset.
 * The dataset uses "piece", "g", "ml" — map those to standard base_unit values.
 */
function resolveBaseUnit(unit: string | null | undefined): string {
  if (!unit) return "piece";
  const u = unit.toLowerCase().trim();
  if (u === "g") return "g";
  if (u === "ml") return "ml";
  if (u === "piece" || u === "pieces" || u === "pcs") return "piece";
  return u; // fallback
}

function resolveDatasetPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "../restaurant_recipe_dataset5.json"),
    path.resolve(__dirname, "../../restaurant_recipe_dataset5.json"),
    path.resolve(__dirname, "../restaurant_recipe_dataset5.json"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  throw new Error(
    `restaurant_recipe_dataset.json not found. Looked in:\n  ${candidates.join("\n  ")}`,
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function populateRecipes() {
  const datasetPath = resolveDatasetPath();
  const raw = fs.readFileSync(datasetPath, "utf8");
  const dataset: DatasetRoot = JSON.parse(raw);

  await ensureDefaultTenant();

  if (!dataset.recipes || typeof dataset.recipes !== "object") {
    throw new Error("Invalid dataset: expected a top-level 'recipes' object");
  }

  // ── Step 1: Collect all unique ingredients across the entire dataset ──────

  console.log("🔍 Scanning dataset for unique ingredients...");

  /** Map ingredient name (lowercase) → { name (original case), unit } */
  const ingredientMap = new Map<string, { name: string; unit: string }>();

  const allRecipeEntries: { category: string; recipe: DatasetRecipe }[] = [];

  for (const [category, items] of Object.entries(dataset.recipes)) {
    for (const recipe of items) {
      allRecipeEntries.push({ category, recipe });
      for (const ing of recipe.ingredients) {
        const key = ing.ingredient.toLowerCase().trim();
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, {
            name: ing.ingredient.trim(),
            unit: resolveBaseUnit(ing.unit),
          });
        }
      }
    }
  }

  console.log(`   Found ${ingredientMap.size} unique ingredients`);
  console.log(
    `   Found ${allRecipeEntries.length} recipe entries across ${Object.keys(dataset.recipes).length} categories`,
  );

  // ── Step 2: Upsert inventory items ────────────────────────────────────────

  console.log("\n📦 Upserting inventory items...");

  /** Map ingredient name (lowercase) → inventory_items.id (UUID) */
  const inventoryIdMap = new Map<string, string>();

  for (const [key, info] of ingredientMap) {
    // Check if it already exists by name (case-insensitive)
    const existing = await db
      .select({ id: inventoryItems.id, name: inventoryItems.name })
      .from(inventoryItems)
      .limit(1000);

    const match = existing.find((e) => e.name?.toLowerCase().trim() === key);

    if (match) {
      inventoryIdMap.set(key, match.id);
      console.log(
        `   ↩ Inventory item already exists: "${info.name}" (id=${match.id})`,
      );
    } else {
      const [created] = await db
        .insert(inventoryItems)
        .values({
          ...tcols(),
          name: info.name,
          unit: info.unit,
          base_unit: info.unit,
          pieces_per_unit: 1,
          min_quantity: 0,
          min_quantity_mode: "global",
          meta: { source: "recipe_dataset" },
        })
        .returning();
      inventoryIdMap.set(key, created.id);
      console.log(
        `   ✅ Created inventory item: "${info.name}" (id=${created.id}, unit=${info.unit})`,
      );
    }
  }

  // ── Step 3: Upsert categories from dataset keys ───────────────────────────

  console.log("\n📂 Upserting categories from dataset...");

  /** Map category slug → category id (UUID) */
  const categoryIdMap = new Map<string, string>();

  const datasetCategories = Object.keys(dataset.recipes);
  for (const catKey of datasetCategories) {
    const slug = slugify(catKey);
    const name = prettifyCategory(catKey);

    const [upserted] = await db
      .insert(categories)
      .values({
        ...tcols(),
        name,
        slug,
        type: "main",
        is_active: true,
      })
      .onConflictDoUpdate({
        target: [categories.branch_id, categories.slug],
        set: {
          name,
          updated_at: new Date(),
        },
      })
      .returning();

    categoryIdMap.set(catKey, upserted.id);
    console.log(`   ✅ Category "${name}" (slug=${slug}, id=${upserted.id})`);
  }

  // ── Step 4: Match/create menu items & create recipes ──────────────────────

  console.log("\n🍳 Creating menu items, recipes, and linking ingredients...");

  // Pre-fetch all menu items for fast lookup
  const allMenuItems = await db.select().from(menuItems);
  const menuItemByName = new Map<string, (typeof allMenuItems)[0]>();
  for (const mi of allMenuItems) {
    menuItemByName.set(mi.name.toLowerCase().trim(), mi);
  }

  let recipesCreated = 0;
  let recipesSkipped = 0;
  let menuItemsCreated = 0;
  let menuItemsExisting = 0;
  let pricesSet = 0;

  for (const { category, recipe } of allRecipeEntries) {
    const menuKey = recipe.item.toLowerCase().trim();
    let menuItem = menuItemByName.get(menuKey);

    // Auto-create menu item if it doesn't exist
    if (!menuItem) {
      const catSlug = slugify(category);
      const catName = prettifyCategory(category);

      const [created] = await db
        .insert(menuItems)
        .values({
          ...tcols(),
          name: recipe.item,
          price: recipe.price != null ? String(recipe.price) : null,
          category: catSlug,
          main_category: catSlug,
          type: "cafe",
          is_available: true,
          meta: { source: "recipe_dataset", dataset_category: category },
        })
        .returning();

      menuItem = created;
      menuItemByName.set(menuKey, created);
      menuItemsCreated++;
      if (recipe.price != null) pricesSet++;
      console.log(
        `   🆕 Created menu item: "${recipe.item}" (id=${created.id}, category=${catName}, price=${recipe.price ?? "—"})`,
      );

      // Link to category via menuItemCategories
      const categoryId = categoryIdMap.get(category);
      if (categoryId) {
        await db
          .insert(menuItemCategories)
          .values({
            ...tcols(),
            menu_item_id: created.id,
            category_id: categoryId,
          })
          .onConflictDoNothing();
      }
    } else {
      menuItemsExisting++;
      // Backfill price if the existing row has none and the dataset has one
      if (recipe.price != null && menuItem.price == null) {
        await db
          .update(menuItems)
          .set({ price: String(recipe.price), updated_at: new Date() })
          .where(eq(menuItems.id, menuItem.id));
        menuItem = { ...menuItem, price: String(recipe.price) };
        menuItemByName.set(menuKey, menuItem);
        pricesSet++;
        console.log(
          `   💰 Backfilled price for "${recipe.item}" (id=${menuItem.id}, price=${recipe.price})`,
        );
      }
    }

    // Check if recipe already exists for this menu item
    const [existingRecipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.menu_item_id, menuItem.id))
      .limit(1);

    if (existingRecipe) {
      console.log(
        `   ↩ Recipe already exists for "${recipe.item}" (recipe id=${existingRecipe.id})`,
      );
      recipesSkipped++;
      continue;
    }

    // Build ingredient list
    const ingredientRows = recipe.ingredients
      .map((ing, index) => {
        const invKey = ing.ingredient.toLowerCase().trim();
        const invId = inventoryIdMap.get(invKey);
        if (!invId) {
          console.log(
            `      ⚠ Inventory item not resolved: "${ing.ingredient}" — skipping ingredient`,
          );
          return null;
        }
        return {
          inventory_item_id: invId,
          quantity: ing.qty,
          display_order: index,
        };
      })
      .filter(Boolean) as {
      inventory_item_id: string;
      quantity: number;
      display_order: number;
    }[];

    if (ingredientRows.length === 0) {
      console.log(`   ⚠ No valid ingredients for "${recipe.item}" — skipping`);
      continue;
    }

    // Create recipe
    const [createdRecipe] = await db
      .insert(recipes)
      .values({
        ...tcols(),
        menu_item_id: menuItem.id,
        name: recipe.item,
        yield_quantity: 1,
        deduct_strategy: "by_menu_category",
        is_active: true,
        meta: { source: "recipe_dataset", category },
      })
      .returning();

    // Create recipe ingredients
    await db.insert(recipeIngredients).values(
      ingredientRows.map((row) => ({
        ...tcols(),
        recipe_id: createdRecipe.id,
        inventory_item_id: row.inventory_item_id,
        quantity: row.quantity,
        waste_factor: "1.000",
        is_optional: false,
        display_order: row.display_order,
      })),
    );

    recipesCreated++;
    console.log(
      `   ✅ Recipe "${recipe.item}" (id=${createdRecipe.id}) → ${ingredientRows.length} ingredients`,
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("📊 SUMMARY");
  console.log("═".repeat(60));
  console.log(`   Inventory items created/found : ${inventoryIdMap.size}`);
  console.log(`   Categories upserted           : ${categoryIdMap.size}`);
  console.log(`   Menu items created            : ${menuItemsCreated}`);
  console.log(`   Menu items already existed    : ${menuItemsExisting}`);
  console.log(`   Recipes created               : ${recipesCreated}`);
  console.log(`   Recipes skipped (existing)    : ${recipesSkipped}`);
  console.log(`   Prices set / backfilled       : ${pricesSet}`);
  console.log("═".repeat(60));
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  try {
    await populateRecipes();
    console.log("\n🎉 Recipe population complete!");
  } catch (err) {
    console.error("\n❌ Recipe population failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  void run();
}
