import { generateLocalId, getLocalDb, localDbTables } from "@/db/localDb";
import { api, isOnline } from "@/infrastructure/api/http-client";
import { eq } from "drizzle-orm";
import { readRows, upsertRow, deleteById } from "@/infrastructure/database/local-db-query";
import type { LocalRecipe, LocalRecipeIngredient } from "@/db/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

const upsertRecipeRow = async (row: any) => {
  return upsertRow(localDbTables.recipes, {
    ...row,
    synced: 1,
  });
};

const upsertIngredientRow = async (row: any) => {
  return upsertRow(localDbTables.recipeIngredients, {
    ...row,
    synced: 1,
  });
};

const clearRecipesForMenuItem = async (menuItemId: string) => {
  const db = await getLocalDb();
  const rows = await db
    .select({ id: localDbTables.recipes.id })
    .from(localDbTables.recipes)
    .where(eq(localDbTables.recipes.menu_item_id, menuItemId));
  for (const row of rows) {
    await db
      .delete(localDbTables.recipeIngredients)
      .where(eq(localDbTables.recipeIngredients.recipe_id, row.id));
  }
  await db
    .delete(localDbTables.recipes)
    .where(eq(localDbTables.recipes.menu_item_id, menuItemId));
};

const normalizeRecipe = (r: any): LocalRecipe => ({
  ...r,
  id: r.id,
  menu_item_id: String(r.menu_item_id),
  name: r.name ?? "",
  yield_quantity: Number(r.yield_quantity ?? 1),
  deduct_from_location_id: r.deduct_from_location_id
    ? String(r.deduct_from_location_id)
    : null,
  deduct_strategy: r.deduct_strategy ?? "by_menu_category",
  is_active: r.is_active !== false && r.is_active !== 0,
  ingredients: Array.isArray(r.ingredients)
    ? r.ingredients.map(normalizeIngredient)
    : [],
  synced: 1 as 0 | 1,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const normalizeIngredient = (ing: any): LocalRecipeIngredient => ({
  ...ing,
  id: ing.id,
  recipe_id: String(ing.recipe_id),
  inventory_item_id: String(ing.inventory_item_id),
  quantity: Number(ing.quantity ?? 0),
  waste_factor: String(ing.waste_factor ?? "1.000"),
  is_optional: Boolean(ing.is_optional),
  notes: ing.notes ?? null,
  display_order: Number(ing.display_order ?? 0),
  name: ing.name,
  unit: ing.unit,
  base_unit: ing.base_unit,
  synced: 1 as 0 | 1,
});

const cacheRecipe = async (recipe: any) => {
  const normalized = normalizeRecipe(recipe);
  await clearRecipesForMenuItem(normalized.menu_item_id);
  await upsertRecipeRow({ ...normalized, ingredients: undefined });
  for (const ing of normalized.ingredients ?? []) {
    await upsertIngredientRow({ ...ing, recipe_id: normalized.id });
  }
  return normalized;
};

const readCachedRecipes = async (): Promise<LocalRecipe[]> => {
  const db = await getLocalDb();
  const recipeRows = await db
    .select({
      raw_json: localDbTables.recipes.raw_json,
      id: localDbTables.recipes.id,
    })
    .from(localDbTables.recipes);

  const ingredientRows = await db
    .select({
      raw_json: localDbTables.recipeIngredients.raw_json,
      recipe_id: localDbTables.recipeIngredients.recipe_id,
    })
    .from(localDbTables.recipeIngredients);

  return recipeRows.map((row) => {
    const recipe = JSON.parse(row.raw_json);
    const ingredients = ingredientRows
      .filter((ing) => ing.recipe_id === row.id)
      .map((ing) => JSON.parse(ing.raw_json));
    return { ...recipe, ingredients };
  });
};

const readCachedRecipeByMenuItemId = async (
  menuItemId: string,
): Promise<LocalRecipe | null> => {
  const all = await readCachedRecipes();
  return all.find((r) => String(r.menu_item_id) === String(menuItemId)) ?? null;
};

// ─── Public API ────────────────────────────────────────────────────────────

export const recipesAdapter = {
  /** Fetch all recipes (optionally filtered by menu_item_id). Falls back to cache. */
  getAll: async (menuItemId?: string): Promise<LocalRecipe[]> => {
    if (isOnline()) {
      try {
        const params = menuItemId ? { menu_item_id: menuItemId } : undefined;
        const response = await api.get("/recipes", { params });
        const recipes = (response as any)?.data?.data?.recipes ?? [];
        const normalized: LocalRecipe[] = [];
        for (const recipe of recipes) {
          const n = await cacheRecipe(recipe);
          normalized.push(n);
        }
        return normalized;
      } catch (err) {
        console.warn("[recipes.api] Online fetch failed, using cache", err);
      }
    }
    const all = await readCachedRecipes();
    return menuItemId ? all.filter((r) => String(r.menu_item_id) === String(menuItemId)) : all;
  },

  /** Fetch single recipe by its menu_item_id. Falls back to cache. */
  getByMenuItemId: async (menuItemId: string): Promise<LocalRecipe | null> => {
    if (isOnline()) {
      try {
        const response = await api.get(`/recipes/menu-item/${menuItemId}`);
        const recipe = (response as any)?.data?.data?.recipe;
        if (recipe) return await cacheRecipe(recipe);
        return null;
      } catch (err) {
        console.warn("[recipes.api] Online fetch failed, using cache", err);
      }
    }
    return readCachedRecipeByMenuItemId(menuItemId);
  },

  /** Create a new recipe with ingredients. Requires online connection. */
  create: async (
    data: Omit<Partial<LocalRecipe>, "ingredients"> & {
      ingredients?: Partial<LocalRecipeIngredient>[];
    },
  ) => {
    if (!isOnline())
      throw new Error("Creating recipes requires an online connection");
    const response = await api.post("/recipes", data);
    return response;
  },

  /** Update recipe (full ingredient list replacement). Requires online connection. */
  update: async (
    id: string,
    data: Omit<Partial<LocalRecipe>, "ingredients"> & {
      ingredients?: Partial<LocalRecipeIngredient>[];
    },
  ) => {
    if (!isOnline())
      throw new Error("Updating recipes requires an online connection");
    const response = await api.put(`/recipes/${id}`, data);
    return response;
  },

  /** Delete a recipe. Requires online connection. */
  delete: async (id: string) => {
    if (!isOnline())
      throw new Error("Deleting recipes requires an online connection");
    const response = await api.delete(`/recipes/${id}`);
    return response;
  },

  /** Cache a recipe fetched from the server into the local SQLite DB. */
  cacheRecipe,

  /** Read all locally cached recipes. */
  readCachedRecipes,
};
