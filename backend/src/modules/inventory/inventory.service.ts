import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { and, asc, eq, sql, inArray, or, like } from "drizzle-orm";
import { db } from "../../db/drizzle";
import {
  inventoryItems,
  stockMovements,
  stockTransfers,
  stockTransferItems,
  inventoryStock,
  stockLocations,
  recipes,
  recipeIngredients,
  menuItems,
} from "../../db/schema";
import { emitCreated, emitDeleted, emitUpdated } from "../sync/sync-emit.util";
import { requireBranchId, tenantInsert } from "../../common/tenant/tenant-context";

const numberOrZero = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};

@Injectable()
export class InventoryService {
  async findAll(page: number = 1, limit: number = 50, search?: string) {
    const offset = (page - 1) * limit;
    
    // Build search condition, always scoped to the active branch
    const branchCondition = eq(inventoryItems.branch_id, requireBranchId());
    const whereCondition = search
      ? and(
          branchCondition,
          or(
            like(inventoryItems.name, `%${search}%`),
            like(inventoryItems.notes, `%${search}%`),
          ),
        )
      : branchCondition;

    // Get total count first
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(whereCondition);

    // Get paginated items
    const items = await db
      .select()
      .from(inventoryItems)
      .where(whereCondition)
      .orderBy(asc(inventoryItems.name))
      .limit(limit)
      .offset(offset);

    // Fetch stock for these items only
    const itemIds = items.map(item => item.id);
    const stockRows = await db
      .select({
        id: inventoryStock.id,
        inventory_item_id: inventoryStock.inventory_item_id,
        location_id: inventoryStock.location_id,
        location_name: stockLocations.name,
        quantity: inventoryStock.quantity,
        min_quantity: inventoryStock.min_quantity,
      })
      .from(inventoryStock)
      .innerJoin(
        stockLocations,
        eq(inventoryStock.location_id, stockLocations.id),
      )
      .where(inArray(inventoryStock.inventory_item_id, itemIds));

    // Group stock by inventory item id
    const stockMap = new Map<string, any[]>();
    for (const row of stockRows) {
      if (!stockMap.has(row.inventory_item_id)) {
        stockMap.set(row.inventory_item_id, []);
      }
      stockMap.get(row.inventory_item_id)!.push({
        location_id: row.location_id,
        location_name: row.location_name,
        quantity: row.quantity,
        min_quantity: row.min_quantity,
      });
    }

    const itemsWithStock = items.map((item) => ({
      ...item,
      stock_by_location: stockMap.get(item.id) || [],
    }));

    return {
      items: itemsWithStock,
      count: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  async findOne(id: string) {
    const branchId = requireBranchId();
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.branch_id, branchId)))
      .limit(1);

    if (!item) throw new NotFoundException("Inventory item not found");

    const stockRows = await db
      .select({
        location_id: inventoryStock.location_id,
        location_name: stockLocations.name,
        quantity: inventoryStock.quantity,
        min_quantity: inventoryStock.min_quantity,
      })
      .from(inventoryStock)
      .innerJoin(
        stockLocations,
        eq(inventoryStock.location_id, stockLocations.id),
      )
      .where(
        and(
          eq(inventoryStock.inventory_item_id, id),
          eq(inventoryStock.branch_id, branchId),
        ),
      );

    return { ...item, stock_by_location: stockRows };
  }

  async findTransfers(page: number = 1, limit: number = 10) {
    const branchId = requireBranchId();
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockTransfers)
      .where(eq(stockTransfers.branch_id, branchId));

    // Get paginated transfers
    const offset = (page - 1) * limit;
    const transfers = await db
      .select({
        id: stockTransfers.id,
        from_location_id: stockTransfers.from_location_id,
        from_location_name: sql<string>`(select name from stock_locations where id = ${stockTransfers.from_location_id})`,
        to_location_id: stockTransfers.to_location_id,
        to_location_name: sql<string>`(select name from stock_locations where id = ${stockTransfers.to_location_id})`,
        status: stockTransfers.status,
        notes: stockTransfers.notes,
        created_by: stockTransfers.created_by,
        received_by: stockTransfers.received_by,
        received_at: stockTransfers.received_at,
        meta: stockTransfers.meta,
        created_at: stockTransfers.created_at,
        updated_at: stockTransfers.updated_at,
      })
      .from(stockTransfers)
      .where(eq(stockTransfers.branch_id, branchId))
      .orderBy(sql`${stockTransfers.created_at} desc`)
      .limit(limit)
      .offset(offset);

    const transferIds = transfers.map(t => t.id);
    const items = await db
      .select()
      .from(stockTransferItems)
      .where(inArray(stockTransferItems.transfer_id, transferIds));

    // Fetch movements for paginated transfers to get quantity_after at time of transfer
    const movements = await db
      .select({
        id: stockMovements.id,
        transfer_id: stockMovements.transfer_id,
        inventory_item_id: stockMovements.inventory_item_id,
        movement_type: stockMovements.movement_type,
        location_id: stockMovements.location_id,
        quantity_delta: stockMovements.quantity_delta,
        quantity_after: stockMovements.quantity_after,
        created_at: stockMovements.created_at,
      })
      .from(stockMovements)
      .where(inArray(stockMovements.transfer_id, transferIds));

    // Group movements by transfer_id and inventory_item_id
    const movementsMap = new Map<string, Map<string, any[]>>();
    for (const m of movements) {
      if (m.transfer_id && !movementsMap.has(m.transfer_id)) {
        movementsMap.set(m.transfer_id, new Map());
      }
      if (!m.transfer_id) continue;
      const itemMap = movementsMap.get(m.transfer_id)!;
      if (m.inventory_item_id && !itemMap.has(m.inventory_item_id)) {
        itemMap.set(m.inventory_item_id, []);
      }
      if (!m.inventory_item_id) continue;
      itemMap.get(m.inventory_item_id)!.push(m);
    }

    const transfersWithItems = transfers.map((transfer) => {
      const transferItems = items.filter((item) => item.transfer_id === transfer.id);
      const itemMovementsMap = movementsMap.get(transfer.id) || new Map();

      // Attach movement data to each transfer item
      const itemsWithMovements = transferItems.map(item => {
        const itemMovements = itemMovementsMap.get(item.inventory_item_id) || [];
        const transferOut = itemMovements.find((m: any) => m.movement_type === 'transfer_out');
        const transferIn = itemMovements.find((m: any) => m.movement_type === 'transfer_in');

        return {
          ...item,
          source_quantity_after: transferOut?.quantity_after ?? null,
          destination_quantity_after: transferIn?.quantity_after ?? null,
        };
      });

      return {
        ...transfer,
        items: itemsWithMovements,
      };
    });

    return {
      transfers: transfersWithItems,
      count: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  async create(payload: any) {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(inventoryItems)
        .values({
          ...tenantInsert(),
          ...(payload.id ? { id: payload.id } : {}),
          name: payload.name,
          unit: payload.unit ?? "piece",
          base_unit: payload.base_unit ?? "piece",
          pieces_per_unit: Math.max(
            1,
            numberOrZero(payload.pieces_per_unit ?? 1),
          ),
          min_quantity: numberOrZero(payload.min_quantity),
          min_quantity_mode: payload.min_quantity_mode ?? "global",
          notes: payload.notes ?? null,
          meta: {},
        })
        .returning();

      // Handle stock_by_location if passed in payload, otherwise use generic quantity at default location
      if (Array.isArray(payload.stock_by_location)) {
        for (const stock of payload.stock_by_location) {
          const locId = String(stock.location_id);
          const qty = numberOrZero(stock.quantity);
          const minQty =
            payload.min_quantity_mode === "per_location"
              ? numberOrZero(stock.min_quantity)
              : 0;
          if (locId && (qty >= 0 || minQty >= 0)) {
            await tx.insert(inventoryStock).values({
              ...tenantInsert(),
              inventory_item_id: created.id,
              location_id: locId,
              quantity: qty,
              min_quantity: minQty,
            });
            if (qty > 0) {
              await tx.insert(stockMovements).values({
                ...tenantInsert(),
                inventory_item_id: created.id,
                movement_type: "initial",
                location_id: locId,
                quantity_delta: qty,
                quantity_after: qty,
                created_by: payload.user_id || null,
              });
            }
          }
        }
      } else {
        const qty = numberOrZero(payload.quantity ?? payload.store_quantity);
        if (qty > 0) {
          const [defaultLoc] = await tx
            .select()
            .from(stockLocations)
            .where(and(eq(stockLocations.is_default, true), eq(stockLocations.branch_id, requireBranchId())))
            .limit(1);
          if (defaultLoc) {
            await tx.insert(inventoryStock).values({
              ...tenantInsert(),
              inventory_item_id: created.id,
              location_id: defaultLoc.id,
              quantity: qty,
              min_quantity: 0,
            });
            await tx.insert(stockMovements).values({
              ...tenantInsert(),
              inventory_item_id: created.id,
              movement_type: "initial",
              location_id: defaultLoc.id,
              quantity_delta: qty,
              quantity_after: qty,
              created_by: payload.user_id || null,
            });
          }
        }
      }

      const [fullItem] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, created.id))
        .limit(1);

      const stocks = await tx
        .select({
          location_id: inventoryStock.location_id,
          location_name: stockLocations.name,
          quantity: inventoryStock.quantity,
          min_quantity: inventoryStock.min_quantity,
        })
        .from(inventoryStock)
        .innerJoin(
          stockLocations,
          eq(inventoryStock.location_id, stockLocations.id),
        )
        .where(eq(inventoryStock.inventory_item_id, created.id));

      const result = {
        ...fullItem,
        stock_by_location: stocks,
      };
      await emitCreated(
        tx,
        "inventory_item",
        "INVENTORY_ITEM_CREATED",
        result as any,
      );
      return result;
    });
  }

  async syncBulk(items: any[]) {
    if (!items || items.length === 0) return {};

    const branchId = requireBranchId();
    const updatedIds: string[] = [];
    const createdIds: string[] = [];

    await db.transaction(async (tx) => {
      for (const payload of items) {
        const [existing] = payload.id
          ? await tx
              .select({ id: inventoryItems.id })
              .from(inventoryItems)
              .where(
                and(
                  eq(inventoryItems.id, payload.id),
                  eq(inventoryItems.branch_id, branchId),
                ),
              )
              .limit(1)
          : [];

        if (existing) {
          const updates: Record<string, any> = { updated_at: new Date() };
          [
            "name",
            "unit",
            "base_unit",
            "pieces_per_unit",
            "min_quantity",
            "min_quantity_mode",
            "notes",
          ].forEach((key) => {
            if (payload[key] !== undefined) {
              updates[key] =
                key === "pieces_per_unit" || key === "min_quantity"
                  ? numberOrZero(payload[key])
                  : payload[key];
            }
          });
          if (updates.pieces_per_unit !== undefined) {
            updates.pieces_per_unit = Math.max(1, updates.pieces_per_unit);
          }

          await tx
            .update(inventoryItems)
            .set(updates)
            .where(
              and(
                eq(inventoryItems.id, payload.id),
                eq(inventoryItems.branch_id, branchId),
              ),
            );
          await this.reconcileStock(tx, payload.id, payload);
          updatedIds.push(payload.id);
        } else {
          const [created] = await tx
            .insert(inventoryItems)
            .values({
              ...tenantInsert(),
              ...(payload.id ? { id: payload.id } : {}),
              name: payload.name,
              unit: payload.unit ?? "piece",
              base_unit: payload.base_unit ?? "piece",
              pieces_per_unit: Math.max(
                1,
                numberOrZero(payload.pieces_per_unit ?? 1),
              ),
              min_quantity: numberOrZero(payload.min_quantity),
              min_quantity_mode: payload.min_quantity_mode ?? "global",
              notes: payload.notes ?? null,
              meta: {},
            })
            .returning();
          await this.applyInitialStock(tx, created.id, payload);
          createdIds.push(created.id);
        }
      }
    });

    for (const id of updatedIds) {
      const item = await this.findOne(id);
      await emitUpdated(db, "inventory_item", "INVENTORY_ITEM_UPDATED", item as any);
    }
    for (const id of createdIds) {
      const item = await this.findOne(id);
      await emitCreated(db, "inventory_item", "INVENTORY_ITEM_CREATED", item as any);
    }

    return {};
  }

  // Seed stock for a newly-created item from `stock_by_location` (or a single
  // generic `quantity` placed at the default location). Mirrors `create`.
  private async applyInitialStock(tx: any, itemId: string, payload: any) {
    if (Array.isArray(payload.stock_by_location)) {
      for (const stock of payload.stock_by_location) {
        const locId = String(stock.location_id);
        const qty = numberOrZero(stock.quantity);
        const minQty =
          payload.min_quantity_mode === "per_location"
            ? numberOrZero(stock.min_quantity)
            : 0;
        if (locId && (qty >= 0 || minQty >= 0)) {
          await tx.insert(inventoryStock).values({
            ...tenantInsert(),
            inventory_item_id: itemId,
            location_id: locId,
            quantity: qty,
            min_quantity: minQty,
          });
          if (qty > 0) {
            await tx.insert(stockMovements).values({
              ...tenantInsert(),
              inventory_item_id: itemId,
              movement_type: "initial",
              location_id: locId,
              quantity_delta: qty,
              quantity_after: qty,
              created_by: payload.user_id || null,
            });
          }
        }
      }
    } else {
      const qty = numberOrZero(payload.quantity ?? payload.store_quantity);
      if (qty > 0) {
        const [defaultLoc] = await tx
          .select()
          .from(stockLocations)
          .where(
            and(
              eq(stockLocations.is_default, true),
              eq(stockLocations.branch_id, requireBranchId()),
            ),
          )
          .limit(1);
        if (defaultLoc) {
          await tx.insert(inventoryStock).values({
            ...tenantInsert(),
            inventory_item_id: itemId,
            location_id: defaultLoc.id,
            quantity: qty,
            min_quantity: 0,
          });
          await tx.insert(stockMovements).values({
            ...tenantInsert(),
            inventory_item_id: itemId,
            movement_type: "initial",
            location_id: defaultLoc.id,
            quantity_delta: qty,
            quantity_after: qty,
            created_by: payload.user_id || null,
          });
        }
      }
    }
  }

  // Reconcile stock for an existing item against `stock_by_location`, logging
  // an adjustment/initial movement for any delta. Mirrors `update`.
  private async reconcileStock(tx: any, itemId: string, payload: any) {
    if (!Array.isArray(payload.stock_by_location)) return;
    for (const stock of payload.stock_by_location) {
      const locId = String(stock.location_id);
      const qty = numberOrZero(stock.quantity);
      const minQty = numberOrZero(stock.min_quantity);
      if (!locId) continue;

      const [existingStock] = await tx
        .select()
        .from(inventoryStock)
        .where(
          and(
            eq(inventoryStock.inventory_item_id, itemId),
            eq(inventoryStock.location_id, locId),
          ),
        )
        .limit(1);

      const finalMinQty =
        payload.min_quantity_mode === "per_location" ? minQty : 0;

      if (existingStock) {
        const delta = qty - existingStock.quantity;
        if (delta !== 0) {
          await tx
            .update(inventoryStock)
            .set({ quantity: qty, min_quantity: finalMinQty })
            .where(eq(inventoryStock.id, existingStock.id));
          await tx.insert(stockMovements).values({
            ...tenantInsert(),
            inventory_item_id: itemId,
            movement_type: "adjustment",
            location_id: locId,
            quantity_delta: delta,
            quantity_after: qty,
            created_by: payload.user_id || null,
          });
        } else if (finalMinQty !== existingStock.min_quantity) {
          await tx
            .update(inventoryStock)
            .set({ min_quantity: finalMinQty })
            .where(eq(inventoryStock.id, existingStock.id));
        }
      } else {
        await tx.insert(inventoryStock).values({
          ...tenantInsert(),
          inventory_item_id: itemId,
          location_id: locId,
          quantity: qty,
          min_quantity: finalMinQty,
        });
        if (qty > 0) {
          await tx.insert(stockMovements).values({
            ...tenantInsert(),
            inventory_item_id: itemId,
            movement_type: "initial",
            location_id: locId,
            quantity_delta: qty,
            quantity_after: qty,
            created_by: payload.user_id || null,
          });
        }
      }
    }
  }

  async update(id: string, payload: any) {
    const updates: Record<string, any> = {
      updated_at: new Date(),
    };
    [
      "name",
      "unit",
      "base_unit",
      "pieces_per_unit",
      "min_quantity",
      "min_quantity_mode",
      "notes",
    ].forEach((key) => {
      if (payload[key] !== undefined) {
        updates[key] =
          key === "pieces_per_unit" || key === "min_quantity"
            ? numberOrZero(payload[key])
            : payload[key];
      }
    });

    if (updates.pieces_per_unit !== undefined) {
      updates.pieces_per_unit = Math.max(1, updates.pieces_per_unit);
    }

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(inventoryItems)
        .set(updates)
        .where(and(eq(inventoryItems.id, id), eq(inventoryItems.branch_id, requireBranchId())))
        .returning();

      if (!updated) throw new NotFoundException("Inventory item not found");

      if (Array.isArray(payload.stock_by_location)) {
        for (const stock of payload.stock_by_location) {
          const locId = String(stock.location_id);
          const qty = numberOrZero(stock.quantity);
          const minQty = numberOrZero(stock.min_quantity);
          if (locId) {
            const [existingStock] = await tx
              .select()
              .from(inventoryStock)
              .where(
                and(
                  eq(inventoryStock.inventory_item_id, id),
                  eq(inventoryStock.location_id, locId),
                ),
              )
              .limit(1);

            if (existingStock) {
              const delta = qty - existingStock.quantity;
              const finalMinQty =
                payload.min_quantity_mode === "per_location" ? minQty : 0;

              if (delta !== 0) {
                await tx
                  .update(inventoryStock)
                  .set({ quantity: qty, min_quantity: finalMinQty })
                  .where(eq(inventoryStock.id, existingStock.id));

                await tx.insert(stockMovements).values({
                  ...tenantInsert(),
                  inventory_item_id: id,
                  movement_type: "adjustment",
                  location_id: locId,
                  quantity_delta: delta,
                  quantity_after: qty,
                  created_by: payload.user_id || null,
                });
              } else if (finalMinQty !== existingStock.min_quantity) {
                await tx
                  .update(inventoryStock)
                  .set({ min_quantity: finalMinQty })
                  .where(eq(inventoryStock.id, existingStock.id));
              }
            } else {
              const finalMinQty =
                payload.min_quantity_mode === "per_location" ? minQty : 0;
              await tx.insert(inventoryStock).values({
                ...tenantInsert(),
                inventory_item_id: id,
                location_id: locId,
                quantity: qty,
                min_quantity: finalMinQty,
              });
              if (qty > 0) {
                await tx.insert(stockMovements).values({
                  ...tenantInsert(),
                  inventory_item_id: id,
                  movement_type: "initial",
                  location_id: locId,
                  quantity_delta: qty,
                  quantity_after: qty,
                  created_by: payload.user_id || null,
                });
              }
            }
          }
        }
      }

      const stocks = await tx
        .select({
          location_id: inventoryStock.location_id,
          location_name: stockLocations.name,
          quantity: inventoryStock.quantity,
          min_quantity: inventoryStock.min_quantity,
        })
        .from(inventoryStock)
        .innerJoin(
          stockLocations,
          eq(inventoryStock.location_id, stockLocations.id),
        )
        .where(eq(inventoryStock.inventory_item_id, id));

      const result = {
        ...updated,
        stock_by_location: stocks,
      };
      await emitUpdated(
        tx,
        "inventory_item",
        "INVENTORY_ITEM_UPDATED",
        result as any,
      );
      return result;
    });
  }

  async delete(id: string) {
    // recipe_ingredients references inventory_items with onDelete: "restrict",
    // so deleting an item still used in a recipe would fail with a raw FK error.
    // Detect this up front and surface a clear, actionable message instead.
    const usedIn = await db
      .select({ recipeName: recipes.name, menuName: menuItems.name })
      .from(recipeIngredients)
      .innerJoin(recipes, eq(recipeIngredients.recipe_id, recipes.id))
      .leftJoin(menuItems, eq(recipes.menu_item_id, menuItems.id))
      .where(eq(recipeIngredients.inventory_item_id, id));

    if (usedIn.length > 0) {
      const names = Array.from(
        new Set(usedIn.map((r) => r.menuName || r.recipeName).filter(Boolean)),
      );
      throw new BadRequestException(
        `Cannot delete this inventory item because it is used in ${usedIn.length} recipe(s)` +
          (names.length ? `: ${names.join(", ")}` : "") +
          ". Remove it from those recipes first.",
      );
    }

    await emitDeleted(db, "inventory_item", "INVENTORY_ITEM_DELETED", id);
    const [deleted] = await db
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.branch_id, requireBranchId())))
      .returning({ id: inventoryItems.id });
    if (!deleted) throw new NotFoundException("Inventory item not found");
    return deleted;
  }

  async getStockMovements(inventoryItemId: string, locationId?: string, page: number = 1, limit: number = 20) {
    const whereConditions = [
      eq(stockMovements.branch_id, requireBranchId()),
      eq(stockMovements.inventory_item_id, inventoryItemId),
    ];

    if (locationId) {
      whereConditions.push(eq(stockMovements.location_id, locationId));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockMovements)
      .where(and(...whereConditions));

    // Get paginated movements
    const offset = (page - 1) * limit;
    const movements = await db
      .select({
        id: stockMovements.id,
        movement_type: stockMovements.movement_type,
        location_id: stockMovements.location_id,
        location_name: sql<string>`(select name from stock_locations where id = ${stockMovements.location_id})`,
        quantity_delta: stockMovements.quantity_delta,
        quantity_after: stockMovements.quantity_after,
        notes: stockMovements.notes,
        meta: stockMovements.meta,
        created_by: stockMovements.created_by,
        created_at: stockMovements.created_at,
        user_name: sql<string>`(select name from users where id = ${stockMovements.created_by})`,
        order_id: stockMovements.order_id,
        order_item_id: stockMovements.order_item_id,
        menu_item_name: sql<string>`(select name from menu_items where id = (${stockMovements.meta}->>'menu_item_id')::uuid)`,
      })
      .from(stockMovements)
      .where(and(...whereConditions))
      .orderBy(sql`${stockMovements.created_at} desc`)
      .limit(limit)
      .offset(offset);

    return {
      movements,
      count: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  async adjustStock(params: {
    inventoryItemId: string;
    locationId: string;
    delta: number; // negative = deduct, positive = add
    movementType: string;
    meta?: {
      orderId?: string;
      updateType?: string;
      source?: string;
      newQuantity?: number;
      previousQuantity?: number;
      delta?: number;
      orderItemId?: string;
      recipeId?: string;
      transferId?: string;
      notes?: string;
    };
    createdBy?: string;
  }): Promise<{ quantityBefore: number; quantityAfter: number }> {
    const {
      inventoryItemId,
      locationId,
      delta,
      movementType,
      meta,
      createdBy,
    } = params;
    const branchId = requireBranchId();

    // Check idempotency for order/sync
    if (meta?.orderId && meta?.orderItemId) {
      const existingMovements = await db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.branch_id, branchId),
            eq(stockMovements.inventory_item_id, inventoryItemId),
            eq(stockMovements.location_id, locationId),
            eq(stockMovements.movement_type, movementType),
          ),
        );

      if (meta?.orderItemId) {
        const dup = existingMovements.find(
          (m) => m.order_item_id === meta.orderItemId,
        );
        if (dup) {
          const [stock] = await db
            .select()
            .from(inventoryStock)
            .where(
              and(
                eq(inventoryStock.branch_id, branchId),
                eq(inventoryStock.inventory_item_id, inventoryItemId),
                eq(inventoryStock.location_id, locationId),
              ),
            )
            .limit(1);
          const qty = stock ? stock.quantity : 0;
          return { quantityBefore: qty, quantityAfter: qty };
        }
      }
    }

    return db.transaction(async (tx) => {
      let [stock] = await tx
        .select()
        .from(inventoryStock)
        .where(
          and(
            eq(inventoryStock.branch_id, branchId),
            eq(inventoryStock.inventory_item_id, inventoryItemId),
            eq(inventoryStock.location_id, locationId),
          ),
        )
        .limit(1);

      const quantityBefore = stock ? stock.quantity : 0;
      const quantityAfter = quantityBefore + delta;

      if (quantityAfter < 0) {
        throw new BadRequestException(
          `Insufficient stock at location (available: ${quantityBefore}, requested: ${Math.abs(delta)})`,
        );
      }

      if (stock) {
        await tx
          .update(inventoryStock)
          .set({ quantity: quantityAfter })
          .where(eq(inventoryStock.id, stock.id));
      } else {
        await tx.insert(inventoryStock).values({
          ...tenantInsert(),
          inventory_item_id: inventoryItemId,
          location_id: locationId,
          quantity: quantityAfter,
          min_quantity: 0,
        });
      }

      await tx.insert(stockMovements).values({
        ...tenantInsert(),
        inventory_item_id: inventoryItemId,
        movement_type: movementType,
        location_id: locationId,
        quantity_delta: delta,
        quantity_after: quantityAfter,
        transfer_id: meta?.transferId || null,
        order_id: meta?.orderId || null,
        order_item_id: meta?.orderItemId || null,
        notes: meta?.notes || null,
        created_by: createdBy || null,
        meta: meta || {},
      });

      return { quantityBefore, quantityAfter };
    });
  }

  async updateQuantity(id: string, payload: any) {
    const branchId = requireBranchId();
    let locationId = payload.location_id || payload.locationId || "";
    if (!locationId) {
      const [defaultLoc] = await db
        .select()
        .from(stockLocations)
        .where(and(eq(stockLocations.is_default, true), eq(stockLocations.branch_id, branchId)))
        .limit(1);
      if (!defaultLoc)
        throw new BadRequestException("No default stock location defined");
      locationId = defaultLoc.id;
    }

    const delta =
      payload.delta !== undefined ? numberOrZero(payload.delta) : null;
    const quantity =
      payload.quantity !== undefined ? numberOrZero(payload.quantity) : null;

    if (delta === null && quantity === null) {
      throw new BadRequestException(
        "Either delta or quantity must be provided",
      );
    }

    const movementType = delta !== null ? "adjustment" : "count";

    if (quantity !== null && delta === null) {
      const [stock] = await db
        .select()
        .from(inventoryStock)
        .where(
          and(
            eq(inventoryStock.branch_id, branchId),
            eq(inventoryStock.inventory_item_id, id),
            eq(inventoryStock.location_id, locationId),
          ),
        )
        .limit(1);
      const currentQty = stock ? stock.quantity : 0;
      const calculatedDelta = quantity - currentQty;

      // Enhanced logging for manual quantity set
      await this.adjustStock({
        inventoryItemId: id,
        locationId,
        delta: calculatedDelta,
        movementType,
        meta: {
          notes: payload.notes || `Manual quantity update: set to ${quantity}`,
          updateType: "manual_set",
          previousQuantity: currentQty,
          newQuantity: quantity,
          source: "inventory_management",
        },
        createdBy: payload.user_id,
      });
    } else if (delta !== null) {
      // Enhanced logging for manual delta adjustment
      const action = delta > 0 ? "added" : "removed";
      await this.adjustStock({
        inventoryItemId: id,
        locationId,
        delta,
        movementType,
        meta: {
          notes:
            payload.notes ||
            `Manual stock ${action}: ${delta > 0 ? "+" : ""}${delta}`,
          updateType: "manual_adjustment",
          delta: delta,
          source: "inventory_management",
        },
        createdBy: payload.user_id,
      });
    }

    const [updated] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.branch_id, branchId)))
      .limit(1);

    const stocks = await db
      .select({
        location_id: inventoryStock.location_id,
        location_name: stockLocations.name,
        quantity: inventoryStock.quantity,
        min_quantity: inventoryStock.min_quantity,
      })
      .from(inventoryStock)
      .innerJoin(
        stockLocations,
        eq(inventoryStock.location_id, stockLocations.id),
      )
      .where(
        and(
          eq(inventoryStock.inventory_item_id, id),
          eq(inventoryStock.branch_id, branchId),
        ),
      );

    return {
      ...updated,
      stock_by_location: stocks,
    };
  }

  async createTransfer(payload: any) {
    const fromLocationId = String(payload.from_location_id || "");
    const toLocationId = String(payload.to_location_id || "");
    const lines = Array.isArray(payload.items) ? payload.items : [];

    if (!fromLocationId || !toLocationId) {
      throw new BadRequestException(
        "Source and destination locations are required",
      );
    }
    if (fromLocationId === toLocationId) {
      throw new BadRequestException(
        "Source and destination locations must be different",
      );
    }
    if (lines.length === 0) {
      throw new BadRequestException("Transfer requires at least one item");
    }

    const branchId = requireBranchId();
    return db.transaction(async (tx) => {
      const [transfer] = await tx
        .insert(stockTransfers)
        .values({
          ...tenantInsert(),
          ...(payload.id ? { id: payload.id } : {}),
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          status: payload.status ?? "sent",
          notes: payload.notes ?? null,
          created_by: payload.user_id,
          meta: {},
        })
        .returning();

      const createdItems: any[] = [];
      for (const line of lines) {
        const itemId = String(line.inventory_item_id || "");
        const quantity = numberOrZero(line.quantity);
        if (!itemId || quantity <= 0) {
          throw new BadRequestException("Invalid transfer item or quantity");
        }

        const [item] = await tx
          .select()
          .from(inventoryItems)
          .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.branch_id, branchId)))
          .limit(1);
        if (!item)
          throw new NotFoundException(`Inventory item ID ${itemId} not found`);

        const [fromStock] = await tx
          .select()
          .from(inventoryStock)
          .where(
            and(
              eq(inventoryStock.branch_id, branchId),
              eq(inventoryStock.inventory_item_id, itemId),
              eq(inventoryStock.location_id, fromLocationId),
            ),
          )
          .limit(1);
        const fromQty = fromStock ? fromStock.quantity : 0;
        if (fromQty < quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}" at source location`,
          );
        }

        const newFromQty = fromQty - quantity;
        if (fromStock) {
          await tx
            .update(inventoryStock)
            .set({ quantity: newFromQty })
            .where(eq(inventoryStock.id, fromStock.id));
        } else {
          await tx.insert(inventoryStock).values({
            ...tenantInsert(),
            inventory_item_id: itemId,
            location_id: fromLocationId,
            quantity: -quantity,
            min_quantity: 0,
          });
        }

        const [toStock] = await tx
          .select()
          .from(inventoryStock)
          .where(
            and(
              eq(inventoryStock.branch_id, branchId),
              eq(inventoryStock.inventory_item_id, itemId),
              eq(inventoryStock.location_id, toLocationId),
            ),
          )
          .limit(1);
        const toQty = toStock ? toStock.quantity : 0;
        const newToQty = toQty + quantity;
        if (toStock) {
          await tx
            .update(inventoryStock)
            .set({ quantity: newToQty })
            .where(eq(inventoryStock.id, toStock.id));
        } else {
          await tx.insert(inventoryStock).values({
            ...tenantInsert(),
            inventory_item_id: itemId,
            location_id: toLocationId,
            quantity: quantity,
            min_quantity: 0,
          });
        }

        const [createdLine] = await tx
          .insert(stockTransferItems)
          .values({
            ...tenantInsert(),
            transfer_id: transfer.id,
            inventory_item_id: itemId,
            quantity,
          })
          .returning();
        createdItems.push(createdLine);

        await tx.insert(stockMovements).values([
          {
            ...tenantInsert(),
            inventory_item_id: itemId,
            movement_type: "transfer_out",
            location_id: fromLocationId,
            quantity_delta: -quantity,
            quantity_after: newFromQty,
            transfer_id: transfer.id,
            created_by: payload.user_id,
          },
          {
            ...tenantInsert(),
            inventory_item_id: itemId,
            movement_type: "transfer_in",
            location_id: toLocationId,
            quantity_delta: quantity,
            quantity_after: newToQty,
            transfer_id: transfer.id,
            created_by: payload.user_id,
          },
        ]);
      }

      return { ...transfer, items: createdItems };
    });
  }

  async receiveTransfer(id: string, payload: any) {
    const [updated] = await db
      .update(stockTransfers)
      .set({
        status: "received",
        received_by: payload.user_id,
        received_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(stockTransfers.id, id), eq(stockTransfers.branch_id, requireBranchId())))
      .returning();
    if (!updated) throw new NotFoundException("Transfer not found");
    return updated;
  }

  async checkAvailability(
    items: Array<{ menu_item_id: string; quantity: number }>,
  ) {
    const branchId = requireBranchId();
    const locationsList = await db
      .select()
      .from(stockLocations)
      .where(eq(stockLocations.branch_id, branchId));
    const defaultLoc =
      locationsList.find((l) => l.is_default) || locationsList[0];

    const resolveLocationId = (recipe: any, menuItem: any) => {
      if (
        recipe.deduct_strategy === "fixed_location" &&
        recipe.deduct_from_location_id
      ) {
        return recipe.deduct_from_location_id;
      }
      if (
        recipe.deduct_strategy === "by_menu_category" &&
        menuItem.main_category
      ) {
        const matched = locationsList.find(
          (l) => l.linked_main_category_slug === menuItem.main_category,
        );
        if (matched) return matched.id;
      }
      return defaultLoc?.id;
    };

    const requirementsMap = new Map<
      string,
      { inventory_item_id: string; location_id: string; quantity: number }
    >();

    for (const item of items) {
      const menuItemId = String(item.menu_item_id || "");
      const qtyOrdered = Number(item.quantity);
      if (!menuItemId || qtyOrdered <= 0) continue;

      const [menuItem] = await db
        .select()
        .from(menuItems)
        .where(and(eq(menuItems.id, menuItemId), eq(menuItems.branch_id, branchId)))
        .limit(1);
      if (!menuItem) continue;

      const [recipe] = await db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.menu_item_id, menuItemId),
            eq(recipes.is_active, true),
            eq(recipes.branch_id, branchId),
          ),
        )
        .limit(1);
      if (!recipe) continue;

      const ingredients = await db
        .select()
        .from(recipeIngredients)
        .where(
          and(
            eq(recipeIngredients.recipe_id, recipe.id),
            eq(recipeIngredients.branch_id, branchId),
          ),
        );

      const locId = resolveLocationId(recipe, menuItem);
      if (!locId) continue;

      for (const ingredient of ingredients) {
        const wasteFactor = Number(ingredient.waste_factor || "1.000");
        const requiredQty =
          (qtyOrdered * ingredient.quantity * wasteFactor) /
          recipe.yield_quantity;
        const key = `${ingredient.inventory_item_id}_${locId}`;

        const existing = requirementsMap.get(key) || {
          inventory_item_id: ingredient.inventory_item_id,
          location_id: locId,
          quantity: 0,
        };
        existing.quantity += Math.ceil(requiredQty);
        requirementsMap.set(key, existing);
      }
    }

    const shortfalls = [];
    for (const [_, req] of requirementsMap.entries()) {
      const [stock] = await db
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
            eq(inventoryStock.branch_id, branchId),
            eq(inventoryStock.inventory_item_id, req.inventory_item_id),
            eq(inventoryStock.location_id, req.location_id),
          ),
        )
        .limit(1);

      const available = stock ? stock.quantity : 0;
      if (available < req.quantity) {
        let itemName = stock?.item_name;
        let baseUnit = stock?.base_unit || "piece";
        let locationName = stock?.location_name;

        if (!stock) {
          const [item] = await db
            .select()
            .from(inventoryItems)
            .where(and(eq(inventoryItems.id, req.inventory_item_id), eq(inventoryItems.branch_id, branchId)))
            .limit(1);
          const [loc] = await db
            .select()
            .from(stockLocations)
            .where(and(eq(stockLocations.id, req.location_id), eq(stockLocations.branch_id, branchId)))
            .limit(1);
          itemName = item?.name || `Item ${req.inventory_item_id}`;
          baseUnit = item?.base_unit || "piece";
          locationName = loc?.name || `Location ${req.location_id}`;
        }

        shortfalls.push({
          inventory_item_id: req.inventory_item_id,
          name: itemName,
          location_id: req.location_id,
          location_name: locationName,
          required: req.quantity,
          available,
          unit: baseUnit,
        });
      }
    }

    return {
      available: shortfalls.length === 0,
      shortfalls,
    };
  }
}
