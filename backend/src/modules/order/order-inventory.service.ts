import { ConflictException, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { inventoryItems } from "../../db/tables/inventory-items.table";
import { inventoryStock } from "../../db/tables/inventory-stock.table";
import { menuItems } from "../../db/tables/menu-items.table";
import { recipes } from "../../db/tables/recipes.table";
import { recipeIngredients } from "../../db/tables/recipe-ingredients.table";
import { stockLocations } from "../../db/tables/stock-locations.table";
import { stockMovements } from "../../db/tables/stock-movements.table";
import { tenantInsert } from "../../common/tenant/tenant-context";

type DbClient = typeof db;

type OrderLine = {
  id?: string;
  menu_item_id?: string;
  quantity?: number;
  main_category?: string;
  item_type?: string;
};

type InventoryRequirement = {
  inventory_item_id: string;
  location_id: string;
  quantity: number;
  order_item_id?: string;
  recipe_id?: string;
  menu_item_id?: string;
  item_name?: string;
  base_unit?: string;
  location_name?: string;
};

const asNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asText = (value: any) =>
  String(value || "")
    .trim()
    .toLowerCase();

@Injectable()
export class OrderInventoryService {
  async reconcileOrderItems(params: {
    tx: DbClient;
    orderId: string;
    previousItems?: OrderLine[];
    nextItems?: OrderLine[];
    createdBy?: string | null;
    allowLowStock?: boolean;
  }) {
    const {
      tx,
      orderId,
      previousItems = [],
      nextItems = [],
      createdBy = null,
      allowLowStock = false,
    } = params;

    if (previousItems.length > 0) {
      const reverseRequirements = await this.buildRequirements(
        tx,
        previousItems,
      );
      await this.applyRequirements(tx, orderId, reverseRequirements, {
        createdBy,
        movementType: "sale_reversal",
        sign: 1,
        allowLowStock,
      });
    }

    if (nextItems.length > 0) {
      const requirements = await this.buildRequirements(tx, nextItems);
      if (!allowLowStock) {
        const shortfalls = await this.findShortfalls(tx, requirements);
        if (shortfalls.length > 0) {
          throw new ConflictException({
            statusCode: 409,
            error: "insufficient_inventory",
            details: shortfalls,
          });
        }
      }

      await this.applyRequirements(tx, orderId, requirements, {
        createdBy,
        movementType: "sale",
        sign: -1,
        allowLowStock,
      });
    }
  }

  async checkAvailability(tx: DbClient, items: OrderLine[]) {
    const requirements = await this.buildRequirements(tx, items);
    const shortfalls = await this.findShortfalls(tx, requirements);

    return {
      available: shortfalls.length === 0,
      shortfalls,
    };
  }

  private async buildRequirements(tx: DbClient, items: OrderLine[]) {
    const requirements: InventoryRequirement[] = [];

    for (const item of items || []) {
      const menuItemId = item?.menu_item_id ? String(item.menu_item_id) : "";
      const quantity = Math.max(0, asNumber(item?.quantity));
      if (!menuItemId || quantity <= 0) {
        continue;
      }

      const [menuItem] = await tx
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, menuItemId))
        .limit(1);

      const [recipe] = await tx
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.menu_item_id, menuItemId),
            eq(recipes.is_active, true),
          ),
        )
        .limit(1);

      if (!recipe) {
        continue;
      }

      const [defaultLocation] = await tx
        .select()
        .from(stockLocations)
        .where(eq(stockLocations.is_default, true))
        .limit(1);

      const linkedLocation = menuItem?.main_category
        ? await tx
            .select()
            .from(stockLocations)
            .where(
              and(
                eq(stockLocations.is_active, true),
                eq(
                  stockLocations.linked_main_category_slug,
                  asText(menuItem.main_category),
                ),
              ),
            )
            .limit(1)
        : [];

      const resolvedLocationId =
        recipe.deduct_strategy === "fixed_location" &&
        recipe.deduct_from_location_id
          ? recipe.deduct_from_location_id
          : (linkedLocation[0]?.id ?? defaultLocation?.id ?? null);

      if (!resolvedLocationId) {
        throw new ConflictException({
          statusCode: 409,
          error: "insufficient_inventory",
          details: [
            {
              inventory_item_id: null,
              item_name: menuItem?.name || `Menu item ${menuItemId}`,
              location_id: null,
              location_name: null,
              required: quantity,
              available: 0,
              unit: "piece",
            },
          ],
        });
      }

      const ingredients = await tx
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipe_id, recipe.id));

      for (const ingredient of ingredients) {
        const yieldQty = Math.max(1, asNumber(recipe.yield_quantity, 1));
        const wasteFactor = Number(ingredient.waste_factor ?? 1) || 1;
        const requiredQty = Math.ceil(
          (quantity * asNumber(ingredient.quantity) * wasteFactor) / yieldQty,
        );

        requirements.push({
          inventory_item_id: ingredient.inventory_item_id,
          location_id: resolvedLocationId,
          quantity: requiredQty,
          order_item_id: item.id ? String(item.id) : undefined,
          recipe_id: recipe.id,
          menu_item_id: menuItemId,
          item_name: menuItem?.name,
        });
      }
    }

    return requirements;
  }

  private async findShortfalls(
    tx: DbClient,
    requirements: InventoryRequirement[],
  ) {
    const aggregated = new Map<
      string,
      InventoryRequirement & { available: number }
    >();

    for (const requirement of requirements) {
      const key = `${requirement.inventory_item_id}:${requirement.location_id}`;
      const existing = aggregated.get(key) || {
        ...requirement,
        available: 0,
      };
      existing.quantity += requirement.quantity;
      aggregated.set(key, existing);
    }

    const shortfalls: any[] = [];
    for (const requirement of aggregated.values()) {
      const [stockRow] = await tx
        .select({
          quantity: inventoryStock.quantity,
          item_name: inventoryItems.name,
          base_unit: inventoryItems.base_unit,
          location_name: stockLocations.name,
        })
        .from(inventoryStock)
        .innerJoin(
          inventoryItems,
          eq(inventoryStock.inventory_item_id, inventoryItems.id),
        )
        .innerJoin(
          stockLocations,
          eq(inventoryStock.location_id, stockLocations.id),
        )
        .where(
          and(
            eq(inventoryStock.inventory_item_id, requirement.inventory_item_id),
            eq(inventoryStock.location_id, requirement.location_id),
          ),
        )
        .limit(1);

      const available = asNumber(stockRow?.quantity, 0);
      if (available < requirement.quantity) {
        shortfalls.push({
          inventory_item_id: requirement.inventory_item_id,
          inventory_item_name:
            stockRow?.item_name ||
            requirement.item_name ||
            `Item ${requirement.inventory_item_id}`,
          location_id: requirement.location_id,
          location_name:
            stockRow?.location_name || `Location ${requirement.location_id}`,
          required: requirement.quantity,
          available,
          unit: stockRow?.base_unit || "piece",
        });
      }
    }

    return shortfalls;
  }

  private async applyRequirements(
    tx: DbClient,
    orderId: string,
    requirements: InventoryRequirement[],
    params: {
      createdBy?: string | null;
      movementType: string;
      sign: 1 | -1;
      allowLowStock?: boolean;
    },
  ) {
    for (const requirement of requirements) {
      const [stockRow] = await tx
        .select()
        .from(inventoryStock)
        .where(
          and(
            eq(inventoryStock.inventory_item_id, requirement.inventory_item_id),
            eq(inventoryStock.location_id, requirement.location_id),
          ),
        )
        .limit(1);

      const quantityBefore = asNumber(stockRow?.quantity, 0);
      const quantityAfter = quantityBefore + requirement.quantity * params.sign;

      if (!params.allowLowStock && quantityAfter < 0) {
        throw new ConflictException({
          statusCode: 409,
          error: "insufficient_inventory",
          details: [
            {
              inventory_item_id: requirement.inventory_item_id,
              inventory_item_name:
                requirement.item_name ||
                `Item ${requirement.inventory_item_id}`,
              location_id: requirement.location_id,
              location_name:
                requirement.location_name ||
                `Location ${requirement.location_id}`,
              required: requirement.quantity,
              available: quantityBefore,
              unit: "piece",
            },
          ],
        });
      }

      if (stockRow) {
        await tx
          .update(inventoryStock)
          .set({ quantity: quantityAfter })
          .where(eq(inventoryStock.id, stockRow.id));
      } else {
        await tx.insert(inventoryStock).values({
          ...tenantInsert(),
          inventory_item_id: requirement.inventory_item_id,
          location_id: requirement.location_id,
          quantity: quantityAfter,
          min_quantity: 0,
        });
      }

      await tx.insert(stockMovements).values({
        ...tenantInsert(),
        inventory_item_id: requirement.inventory_item_id,
        movement_type: params.movementType,
        location_id: requirement.location_id,
        quantity_delta: requirement.quantity * params.sign,
        quantity_after: quantityAfter,
        order_id: orderId,
        order_item_id: requirement.order_item_id ?? null,
        notes: null,
        created_by: params.createdBy ?? null,
        meta: {
          recipe_id: requirement.recipe_id ?? null,
          menu_item_id: requirement.menu_item_id ?? null,
        },
      });
    }
  }
}
