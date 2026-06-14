import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { recipes, recipeIngredients, inventoryItems, menuItems } from "../../db/schema";
import { emitCreated, emitDeleted, emitUpdated } from "../sync/sync-emit.util";
import { requireBranchId, tenantInsert } from "../../common/tenant/tenant-context";

@Injectable()
export class RecipesService {
  async findAll(menuItemId?: string) {
    const conditions = [eq(recipes.branch_id, requireBranchId())];
    if (menuItemId) {
      conditions.push(eq(recipes.menu_item_id, menuItemId));
    }

    const baseRecipes = await db
      .select()
      .from(recipes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(recipes.name));

    if (baseRecipes.length === 0) return [];

    const hydrated = [];
    for (const recipe of baseRecipes) {
      const ingredients = await db
        .select({
          id: recipeIngredients.id,
          recipe_id: recipeIngredients.recipe_id,
          inventory_item_id: recipeIngredients.inventory_item_id,
          quantity: recipeIngredients.quantity,
          waste_factor: recipeIngredients.waste_factor,
          is_optional: recipeIngredients.is_optional,
          notes: recipeIngredients.notes,
          display_order: recipeIngredients.display_order,
          name: inventoryItems.name,
          unit: inventoryItems.unit,
          base_unit: inventoryItems.base_unit,
        })
        .from(recipeIngredients)
        .leftJoin(inventoryItems, eq(recipeIngredients.inventory_item_id, inventoryItems.id))
        .where(eq(recipeIngredients.recipe_id, recipe.id))
        .orderBy(asc(recipeIngredients.display_order), asc(recipeIngredients.id));

      hydrated.push({
        ...recipe,
        ingredients,
      });
    }

    return hydrated;
  }

  async findById(id: string) {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.branch_id, requireBranchId())))
      .limit(1);

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    const ingredients = await db
      .select({
        id: recipeIngredients.id,
        recipe_id: recipeIngredients.recipe_id,
        inventory_item_id: recipeIngredients.inventory_item_id,
        quantity: recipeIngredients.quantity,
        waste_factor: recipeIngredients.waste_factor,
        is_optional: recipeIngredients.is_optional,
        notes: recipeIngredients.notes,
        display_order: recipeIngredients.display_order,
        name: inventoryItems.name,
        unit: inventoryItems.unit,
        base_unit: inventoryItems.base_unit,
      })
      .from(recipeIngredients)
      .leftJoin(inventoryItems, eq(recipeIngredients.inventory_item_id, inventoryItems.id))
      .where(eq(recipeIngredients.recipe_id, recipe.id))
      .orderBy(asc(recipeIngredients.display_order), asc(recipeIngredients.id));

    return {
      ...recipe,
      ingredients,
    };
  }

  async findByMenuItemId(menuItemId: string) {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.menu_item_id, menuItemId),
          eq(recipes.branch_id, requireBranchId()),
        ),
      )
      .limit(1);

    if (!recipe) return null;

    return this.findById(recipe.id);
  }

  async create(payload: any) {
    const menuItemId = payload.menu_item_id ? String(payload.menu_item_id) : "";
    if (!menuItemId) {
      throw new BadRequestException("Valid menu_item_id is required");
    }

    // Verify menu item exists
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.id, menuItemId), eq(menuItems.branch_id, requireBranchId())))
      .limit(1);
    if (!menuItem) {
      throw new NotFoundException(`Menu item ${menuItemId} does not exist`);
    }

    // Check if recipe already exists for this menu item
    const existing = await this.findByMenuItemId(menuItemId);
    if (existing) {
      throw new BadRequestException(`A recipe already exists for menu item ${menuItemId}`);
    }

    const name = String(payload.name || menuItem.name).trim();

    return db.transaction(async (tx) => {
      const [insertedRecipe] = await tx
        .insert(recipes)
        .values({
          ...tenantInsert(),
          ...(payload.id ? { id: payload.id } : {}),
          menu_item_id: menuItemId,
          name,
          yield_quantity: Number(payload.yield_quantity || 1),
          deduct_from_location_id: payload.deduct_from_location_id ? String(payload.deduct_from_location_id) : null,
          deduct_strategy: String(payload.deduct_strategy || "by_menu_category"),
          is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
          meta: payload.meta || {},
        })
        .returning();

      const ingredientsPayload = Array.isArray(payload.ingredients) ? payload.ingredients : [];
      if (ingredientsPayload.length > 0) {
        await tx.insert(recipeIngredients).values(
          ingredientsPayload.map((ing: any, index: number) => ({
            ...tenantInsert(),
            recipe_id: insertedRecipe.id,
            inventory_item_id: String(ing.inventory_item_id),
            quantity: Number(ing.quantity),
            waste_factor: String(ing.waste_factor || "1.000"),
            is_optional: Boolean(ing.is_optional),
            notes: ing.notes ? String(ing.notes) : null,
            display_order: ing.display_order !== undefined ? Number(ing.display_order) : index,
          }))
        );
      }

      return insertedRecipe.id;
    }).then(async (id) => {
      const full = await this.findById(id);
      if (full) {
        await emitCreated(db, "recipe", "RECIPE_CREATED", full as any);
      }
      return full;
    });
  }

  async update(id: string, payload: any) {
    const existing = await this.findById(id);

    return db.transaction(async (tx) => {
      // Update core recipe table
      await tx
        .update(recipes)
        .set({
          name: payload.name ? String(payload.name).trim() : existing.name,
          yield_quantity: payload.yield_quantity !== undefined ? Number(payload.yield_quantity) : existing.yield_quantity,
          deduct_from_location_id: payload.deduct_from_location_id !== undefined
            ? (payload.deduct_from_location_id ? String(payload.deduct_from_location_id) : null)
            : existing.deduct_from_location_id,
          deduct_strategy: payload.deduct_strategy !== undefined ? String(payload.deduct_strategy) : existing.deduct_strategy,
          is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : existing.is_active,
          meta: payload.meta !== undefined ? payload.meta : existing.meta,
          updated_at: new Date(),
        })
        .where(and(eq(recipes.id, id), eq(recipes.branch_id, requireBranchId())));

      // Handle ingredients list replace
      if (payload.ingredients !== undefined) {
        // Delete all old ingredients
        await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipe_id, id));

        const ingredientsPayload = Array.isArray(payload.ingredients) ? payload.ingredients : [];
        if (ingredientsPayload.length > 0) {
          await tx.insert(recipeIngredients).values(
            ingredientsPayload.map((ing: any, index: number) => ({
              ...tenantInsert(),
              recipe_id: id,
              inventory_item_id: String(ing.inventory_item_id),
              quantity: Number(ing.quantity),
              waste_factor: String(ing.waste_factor || "1.000"),
              is_optional: Boolean(ing.is_optional),
              notes: ing.notes ? String(ing.notes) : null,
              display_order: ing.display_order !== undefined ? Number(ing.display_order) : index,
            }))
          );
        }
      }
    }).then(async () => {
      const full = await this.findById(id);
      if (full) {
        await emitUpdated(db, "recipe", "RECIPE_UPDATED", full as any);
      }
      return full;
    });
  }

  async delete(id: string) {
    const existing = await this.findById(id);
    await emitDeleted(db, "recipe", "RECIPE_DELETED", id);
    await db.delete(recipes).where(and(eq(recipes.id, id), eq(recipes.branch_id, requireBranchId())));
    return existing;
  }
}
