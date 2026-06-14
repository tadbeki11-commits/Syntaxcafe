import { Injectable, BadRequestException } from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { menuItems } from "../../db/tables/menu-items.table";
import { order_items } from "../../db/tables/order-items.table";
import { orderStatusLogs } from "../../db/tables/order-status-logs.table";
import { orders } from "../../db/tables/orders.table";
import { payments } from "../../db/tables/payments.table";
import { stockMovements } from "../../db/tables/stock-movements.table";
import { systemSettings } from "../../db/tables/system-settings.table";
import { users } from "../../db/tables/users.table";
import { randomUUID } from "crypto";
import { OrderInventoryService } from "./order-inventory.service";
import { emitCreated, emitUpdated } from "../sync/sync-emit.util";
import { requireBranchId, tenantInsert } from "../../common/tenant/tenant-context";
import { OrdersGateway } from "./orders.gateway";


@Injectable()
export class OrderService {
  constructor(
    private readonly orderInventoryService: OrderInventoryService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  private normalizeTableNumber(tableNumber: any): number | null {
    return tableNumber == null || tableNumber === "" ? null : tableNumber;
  }

  private normalizeOrganizationId(organizationId: any): string | null {
    return organizationId == null || organizationId === "" ? null : String(organizationId);
  }

  private validateUserId(userId: string, validUserIds: Set<string>, fallbackId?: string): string | null {
    if (validUserIds.has(userId)) return userId;
    if (fallbackId && validUserIds.has(fallbackId)) return fallbackId;
    return null;
  }

  private mapOrderItems(items: any[], orderId: string): any[] {
    return items.map((item: any) => ({
      ...tenantInsert(),
      order_id: orderId,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: Number(item.subtotal) || Number(item.unit_price) * Number(item.quantity),
      item_type: item.item_type || "food",
      main_category: item.main_category,
    }));
  }

  private isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  }

  private async getSetting(key: string): Promise<string | null> {
    const [row] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.branch_id, requireBranchId()),
          eq(systemSettings.key, key),
        ),
      )
      .limit(1);
    return row?.value ?? null;
  }

  private async isLowStockAllowed(): Promise<boolean> {
    return (await this.getSetting("allow_low_stock_orders")) === "true";
  }

  private async isTableSelectionRequired(): Promise<boolean> {
    return (await this.getSetting("force_table_selection")) === "true";
  }

  async create(orderData: any) {
    const {
      employee_id,
      customer_id,
      table_number,
      type,
      items,
      total_amount,
      notes,
      organization_id,
      is_price_override,
    } = orderData;
    
    const safeTableNumber = this.normalizeTableNumber(table_number);
    const safeOrganizationId = this.normalizeOrganizationId(organization_id);

    if (type === "cafe" || !type) {
      const requireTableSelection = await this.isTableSelectionRequired();
      if (requireTableSelection && (safeTableNumber == null || isNaN(parseInt(String(safeTableNumber), 10)))) {
        throw new BadRequestException("Table selection is required for cafe orders.");
      }
    }

    const createdOrder = await db.transaction(async (tx: any) => {
      const [order] = await tx
        .insert(orders)
        .values({
          ...tenantInsert(),
          ...(orderData.id ? { id: orderData.id } : {}),
          customer_id: customer_id || randomUUID(),
          employee_id,
          table_number: safeTableNumber,
          organization_id: safeOrganizationId,
          is_price_override: Boolean(is_price_override),
          type,
          total_amount,
          status: "pending",
          notes,
          meta: {},
        })
        .returning();

      if (items && items.length > 0) {
        await tx.insert(order_items).values(this.mapOrderItems(items, order.id));
      }

      return order;
    });

    if (createdOrder) {
      const fullOrder = await this.findById(createdOrder.id);
      if (fullOrder) {
        await emitCreated(db, "order", "ORDER_CREATED", fullOrder as any);
        // Push to any cashier/kitchen clients watching this branch in real time.
        this.ordersGateway.notifyNewOrder(
          (fullOrder as any).branch_id,
          fullOrder,
        );
      }
      return fullOrder;
    }

    return null;
  }

  private async syncOrder(orderData: any, validUserIds: Set<string>, syncUserId: string, tx: any) {
    const {
      id,
      employee_id,
      waiter_id,
      customer_id,
      table_number,
      type,
      items,
      total_amount,
      notes,
      status,
      payment_status,
      created_at,
      organization_id,
      is_price_override,
    } = orderData;

    const finalEmployeeId = this.validateUserId(employee_id, validUserIds, syncUserId);
    
    if(!finalEmployeeId){
      console.warn(`[BulkSync] Skipping order ${id}: employee_id ${employee_id} not found in valid users`);
      return 
    }
    const finalWaiterId = this.validateUserId(waiter_id, validUserIds, finalEmployeeId);
    const safeTableNumber = this.normalizeTableNumber(table_number);
    const safeOrganizationId = this.normalizeOrganizationId(organization_id);

    const [existingOrder] = id
      ? await tx.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1)
      : [];

    if (existingOrder) {
      // Priority: cancelled/voided > paid/completed > pending/preparing/ready
      // Only update the existing order if the incoming status outranks the current one
      const statusPriority: Record<string, number> = {
        voided: 5,
        cancelled: 5,
        paid: 4,
        completed: 3,
        ready: 2,
        preparing: 1,
        pending: 0,
      };

      const incomingStatus = String(status || '').toLowerCase();
      const existingStatus = String(existingOrder.status || '').toLowerCase();
      const incomingPriority = statusPriority[incomingStatus] ?? -1;
      const existingPriority = statusPriority[existingStatus] ?? -1;

      if (incomingPriority > existingPriority) {
        await tx
          .update(orders)
          .set({ status: incomingStatus, payment_status: payment_status || undefined, updated_at: new Date() })
          .where(eq(orders.id, id));
        console.log(`[BulkSync] Updated existing order ${id} status: "${existingStatus}" → "${incomingStatus}"`);
      } else if (incomingStatus !== existingStatus) {
        console.log(`[BulkSync] Skipping status downgrade for order ${id}: "${existingStatus}" (existing) ≥ "${incomingStatus}" (incoming)`);
      }

      return;
    }

    const [createdOrder] = await tx
      .insert(orders)
      .values({
        ...tenantInsert(),
        id,
        customer_id: customer_id || randomUUID(),
        employee_id: finalEmployeeId,
        waiter_id: finalWaiterId,
        table_number: safeTableNumber,
        organization_id: safeOrganizationId,
        is_price_override: Boolean(is_price_override),
        type: type || "cafe",
        total_amount,
        status: status || "pending",
        payment_status,
        notes,
        created_at: created_at ? new Date(created_at) : new Date(),
        meta: {},
      })
      .returning();

    if (items && items.length > 0) {

      // First: filter out items with non-UUID menu_item_ids
      const validItems = items.filter((item: any) => {
        const menuItemId = item.menu_item_id;
        if (menuItemId === null || menuItemId === undefined) return true;
        if (typeof menuItemId === 'string' && this.isValidUUID(menuItemId)) return true;
        console.warn(`[BulkSync] Skipping item with invalid menu_item_id: ${menuItemId}`);
        return false;
      });

      // Collect all referenced menu_item_ids and check which ones exist in the DB
      const referencedMenuItemIds = validItems
        .map((item: any) => item.menu_item_id)
        .filter((id: any) => id != null && id !== '');

      const existingMenuItemIds = new Set<string>();
      if (referencedMenuItemIds.length > 0) {
        const existingRows = await tx
          .select({ id: menuItems.id })
          .from(menuItems)
          .where(inArray(menuItems.id, referencedMenuItemIds));
        existingRows.forEach((r: any) => existingMenuItemIds.add(r.id));
      }

      const orderItemsToInsert = validItems.map((item: any) => {
        const menuItemId = item.menu_item_id && item.menu_item_id !== '' ? item.menu_item_id : null;
        // If the menu_item_id doesn't exist in DB, set to null to avoid FK violation
        const safeMenuItemId = menuItemId && existingMenuItemIds.has(menuItemId) ? menuItemId : null;
        if (menuItemId && !safeMenuItemId) {
          console.warn(`[BulkSync] menu_item_id ${menuItemId} not found in DB — setting to null for order item`);
        }
        return {
          ...tenantInsert(),
          id: item.id || randomUUID(),
          order_id: createdOrder.id,
          menu_item_id: safeMenuItemId,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: Number(item.subtotal) || Number(item.unit_price) * Number(item.quantity),
          item_type: item.item_type || 'food',
          main_category: item.main_category,
        };
      });

      if (orderItemsToInsert.length > 0) {
        try {
          await tx.insert(order_items).values(orderItemsToInsert);
        } catch (insertErr) {
          console.error(`[BulkSync] Failed to insert order_items for order ${createdOrder.id}:`, (insertErr as Error)?.message);
        }
      }
    }

    if (String(status || "").toLowerCase() === "paid") {
      const syncedItems = await this.loadOrderItems(createdOrder.id, undefined, tx);
      try {
        await this.orderInventoryService.reconcileOrderItems({
          tx,
          orderId: createdOrder.id,
          previousItems: [],
          nextItems: syncedItems,
          createdBy: finalEmployeeId || null,
          allowLowStock: true,
        });
      } catch (error) {
        console.warn(
          `[BulkSync] Inventory reconciliation failed for order ${createdOrder.id}; order is still logged.`,
          (error as Error)?.message,
        );
      }
    }
  }

  private async syncPayment(paymentData: any, validUserIds: Set<string>, syncUserId: string, tx: any) {
    const {
      id,
      order_id,
      amount,
      payment_method,
      status,
      processed_by,
      paid_at,
      description,
    } = paymentData;

    if (!order_id) {
      console.warn(`[BulkSync] Skipping payment ${id}: no order_id provided`);
      return;
    }

    const [verifiedOrder] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, order_id));
    if (!verifiedOrder) {
      console.warn(`[BulkSync] Skipping payment ${id}: Order ${order_id} not found in DB.`);
      return;
    }

    const finalProcessedBy = this.validateUserId(processed_by, validUserIds, syncUserId);

    await tx.insert(payments).values({
      ...tenantInsert(),
      id,
      order_id,
      amount,
      amount_cents: amount,
      payment_method,
      method: payment_method,
      status: status || "paid",
      processed_by: finalProcessedBy,
      paid_at: paid_at ? new Date(paid_at) : new Date(),
      description: description || null,
      meta: {},
    });

    if (status === "paid" || !status) {
      const [existingSaleMovement] = await tx
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(and(eq(stockMovements.order_id, order_id), eq(stockMovements.movement_type, "sale")))
        .limit(1);

      await tx
        .update(orders)
        .set({ status: "paid", payment_status: "paid", updated_at: new Date() })
        .where(eq(orders.id, order_id));

      if (!existingSaleMovement) {
        const paidItems = await this.loadOrderItems(order_id, undefined, tx);
        try {
          await this.orderInventoryService.reconcileOrderItems({
            tx,
            orderId: order_id,
            previousItems: [],
            nextItems: paidItems,
            createdBy: finalProcessedBy || null,
            allowLowStock: true,
          });
        } catch (error) {
          console.warn(
            `[BulkSync] Inventory reconciliation failed for payment ${id}; payment is still logged.`,
            (error as Error)?.message,
          );
        }
      }
    }
  }

  async bulkSync(data: any) {
    const { orders: syncOrders = [], payments: syncPayments = [], user_id: syncUserId } = data;

    console.log(`[OrderService] Starting bulk sync: ${syncOrders.length} orders, ${syncPayments.length} payments`);

    const userRows = await db.select({ id: users.id }).from(users);
    const validUserIds = new Set(userRows.map((u) => u.id));

    await db.transaction(async (tx: any) => {
      for (const orderData of syncOrders) {
        await this.syncOrder(orderData, validUserIds, syncUserId, tx);
      }

      for (const paymentData of syncPayments) {
        await this.syncPayment(paymentData, validUserIds, syncUserId, tx);
      }
    });

    return {};
  }

  async findById(id: string) {
    const [orderRow] = await db
      .select({
        order: orders,
        employee: users,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!orderRow) return null;

    const items = await this.loadOrderItems(id);
    return this.toOrderResponse(orderRow.order, orderRow.employee, items);
  }

  async findAll(filters: any) {
    const conditions = [eq(orders.branch_id, requireBranchId())] as any[];
    if (filters.status) conditions.push(eq(orders.status, filters.status));
    if (filters.type) conditions.push(eq(orders.type, filters.type));
    if (filters.employee_id)
      conditions.push(eq(orders.employee_id, filters.employee_id));
    if (filters.table_number)
      conditions.push(eq(orders.table_number, filters.table_number));
    if (filters.date_from) {
      const dateFrom = new Date(filters.date_from);
      conditions.push(gte(orders.created_at, dateFrom));
    }
    if (filters.date_to) {
      const dateTo = new Date(filters.date_to);
      conditions.push(lte(orders.created_at, dateTo));
    }

    const rows = await db
      .select({
        order: orders,
        employee: users,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.created_at));

    const ordersWithItems = [] as any[];
    for (const row of rows) {
      const items = await this.loadOrderItems(row.order.id);
      ordersWithItems.push(
        this.toOrderResponse(row.order, row.employee, items),
      );
    }

    return ordersWithItems;
  }

  async updateStatus(id: string, status: string, updatedBy?: any) {
    return db.transaction(async (tx: any) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const [updated] = await tx
        .update(orders)
        .set({ status, updated_at: new Date() })
        .where(eq(orders.id, id))
        .returning();

      if (updated) {
        const wasPaid =
          String(existingOrder?.payment_status || "").toLowerCase() ===
            "paid" ||
          String(existingOrder?.status || "").toLowerCase() === "paid";

        if (
          status === "cancelled" &&
          existingOrder?.status !== "cancelled" &&
          wasPaid
        ) {
          const currentItems = await this.loadOrderItems(id, undefined, tx);
          await this.orderInventoryService.reconcileOrderItems({
            tx,
            orderId: id,
            previousItems: currentItems,
            nextItems: [],
            createdBy: updatedBy || null,
          });
        }
        await this.logStatusChange(id, status, updatedBy);
        const full = await this.findById(id);
        if (full) {
          await emitUpdated(tx, "order", "ORDER_UPDATED", full as any);
        }
      }

      return updated;
    });
  }

  async getStatusHistory(id: string) {
    const rows = await db
      .select({
        log: orderStatusLogs,
        user: users,
      })
      .from(orderStatusLogs)
      .leftJoin(users, eq(orderStatusLogs.changed_by, users.id))
      .where(eq(orderStatusLogs.order_id, id))
      .orderBy(desc(orderStatusLogs.changed_at));

    return rows.map((row: any) => ({
      ...row.log,
      changed_by_name: this.formatEmployeeName(row.user),
    }));
  }

  async getPendingOrders(type?: string) {
    const conditions = [
      inArray(orders.status, ["pending", "preparing"]),
    ] as any[];
    if (type) conditions.push(eq(orders.type, type));

    const rows = await db
      .select({
        order: orders,
        employee: users,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(and(...conditions))
      .orderBy(asc(orders.created_at));

    const ordersWithItems = [] as any[];
    for (const row of rows) {
      const items = await this.loadOrderItems(row.order.id);
      ordersWithItems.push(
        this.toOrderResponse(row.order, row.employee, items),
      );
    }
    return ordersWithItems;
  }

  async getReadyOrders(type?: string) {
    const conditions = [eq(orders.status, "ready")] as any[];
    if (type) conditions.push(eq(orders.type, type));

    const rows = await db
      .select({
        order: orders,
        employee: users,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(and(...conditions))
      .orderBy(asc(orders.updated_at));

    const ordersWithItems = [] as any[];
    for (const row of rows) {
      const items = await this.loadOrderItems(row.order.id);
      ordersWithItems.push(
        this.toOrderResponse(row.order, row.employee, items),
      );
    }
    return ordersWithItems;
  }

  async createCafeOrder(data: any) {
    return this.create({ ...data, type: "cafe" });
  }

  async getKitchenOrders() {
    const rows = await db
      .select({
        order: orders,
        employee: users,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .leftJoin(order_items, eq(orders.id, order_items.order_id))
      .where(
        and(
          eq(orders.type, "cafe"),
          inArray(orders.status, ["pending", "preparing"]),
          eq(order_items.item_type, "food"),
        ),
      )
      .orderBy(asc(orders.created_at));

    const uniqueOrders = new Map<string, any>();
    for (const row of rows) {
      if (!uniqueOrders.has(row.order.id)) {
        const items = await this.loadOrderItems(row.order.id, "food");
        uniqueOrders.set(
          row.order.id,
          this.toOrderResponse(row.order, row.employee, items),
        );
      }
    }

    return Array.from(uniqueOrders.values());
  }

  async markOrderReady(id: string, updatedBy?: any) {
    const updated = await this.updateStatus(id, "ready", updatedBy);
    await this.markFoodItemsReady(id);
    return updated;
  }

  async completeOrder(id: string, completedBy?: any) {
    return this.updateStatus(id, "completed", completedBy);
  }

  async getOrdersForPayment(filters: any) {
    return this.findAll(filters);
  }

  async updateOrderItems(id: string, items: any[], updatedBy?: any) {
    const allowLowStock = await this.isLowStockAllowed();
    return db.transaction(async (tx: any) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);
      const wasPaid =
        String(existingOrder?.payment_status || "").toLowerCase() === "paid" ||
        String(existingOrder?.status || "").toLowerCase() === "paid";
      const previousItems = await this.loadOrderItems(id, undefined, tx);
      await tx.delete(order_items).where(eq(order_items.order_id, id));

      let newTotal = 0;
      const newItems = items.map((item: any) => {
        const subtotal = Number(item.unit_price) * Number(item.quantity);
        newTotal += subtotal;
        return {
          ...tenantInsert(),
          order_id: id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal,
        };
      });

      if (newItems.length > 0) {
        await tx.insert(order_items).values(newItems);
      }

      await tx
        .update(orders)
        .set({ total_amount: newTotal, updated_at: new Date() })
        .where(eq(orders.id, id));

      if (wasPaid) {
        const nextItems = await this.loadOrderItems(id, undefined, tx);
        await this.orderInventoryService.reconcileOrderItems({
          tx,
          orderId: id,
          previousItems,
          nextItems,
          createdBy: updatedBy || null,
          allowLowStock,
        });
      }

      return this.findById(id);
    });
  }

  async addOrderItems(id: string, items: any[], updatedBy?: any) {
    const allowLowStock = await this.isLowStockAllowed();
    return db.transaction(async (tx: any) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);
      const wasPaid =
        String(existingOrder?.payment_status || "").toLowerCase() === "paid" ||
        String(existingOrder?.status || "").toLowerCase() === "paid";
      const previousItems = await this.loadOrderItems(id, undefined, tx);
      const [order] = await tx
        .select({ total_amount: orders.total_amount })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const currentTotal = Number(order?.total_amount || 0);
      let additionalTotal = 0;

      for (const item of items) {
        const [existingItem] = await tx
          .select()
          .from(order_items)
          .where(and(eq(order_items.order_id, id), eq(order_items.menu_item_id, item.menu_item_id)))
          .limit(1);

        const itemSubtotal = Number(item.unit_price) * Number(item.quantity);
        additionalTotal += itemSubtotal;

        if (existingItem) {
          const newQuantity = Number(existingItem.quantity) + Number(item.quantity);
          await tx
            .update(order_items)
            .set({ quantity: newQuantity, subtotal: Number(item.unit_price) * newQuantity })
            .where(and(eq(order_items.order_id, id), eq(order_items.menu_item_id, item.menu_item_id)));
        } else {
          await tx.insert(order_items).values({
            ...tenantInsert(),
            order_id: id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: itemSubtotal,
            item_type: item.item_type || "food",
            main_category: item.main_category,
          });
        }
      }

      await tx
        .update(orders)
        .set({ total_amount: currentTotal + additionalTotal, updated_at: new Date() })
        .where(eq(orders.id, id));

      if (wasPaid) {
        const nextItems = await this.loadOrderItems(id, undefined, tx);
        await this.orderInventoryService.reconcileOrderItems({
          tx,
          orderId: id,
          previousItems,
          nextItems,
          createdBy: updatedBy || null,
          allowLowStock,
        });
      }

      return this.findById(id);
    });
  }

  async getOrdersByType(orderType: string) {
    const rows = await db
      .select({
        order: orders,
        employee: users,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(eq(orders.type, "cafe"));

    const filtered = rows.filter((row: any) => {
      if (orderType === "beverage_only") {
        return row.order.status === "ready" || row.order.status === "completed";
      }
      if (orderType === "kitchen") {
        return (
          row.order.status === "pending" || row.order.status === "preparing"
        );
      }
      return true;
    });

    const ordersWithItems = [] as any[];
    for (const row of filtered) {
      const items = await this.loadOrderItems(row.order.id);
      const beverageCount = items.filter(
        (item: any) => item.item_type === "beverage",
      ).length;
      const foodCount = items.filter(
        (item: any) => item.item_type === "food",
      ).length;
      ordersWithItems.push({
        ...this.toOrderResponse(row.order, row.employee, items),
        beverage_count: beverageCount,
        food_count: foodCount,
        order_composition:
          foodCount > 0 && beverageCount > 0
            ? "mixed"
            : beverageCount > 0
              ? "beverage_only"
              : "food_only",
      });
    }

    return ordersWithItems;
  }

  async markFoodReady(id: string) {
    await this.markFoodItemsReady(id);
    return this.findById(id);
  }

  async getOccupiedTables() {
    const rows = await db
      .select({
        order: orders,
        employee: users,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(
        and(
          eq(orders.type, "cafe"),
          inArray(orders.status, ["pending", "preparing", "ready"]),
        ),
      )
      .orderBy(asc(orders.table_number));

    return rows
      .filter((row: any) => row.order.table_number != null)
      .map((row: any) => ({
        table_number: row.order.table_number,
        order_id: row.order.id,
        status: row.order.status,
        waiter_name: this.formatEmployeeName(row.employee),
      }));
  }

  private async logStatusChange(
    orderId: string,
    status: string,
    updatedBy?: any,
  ) {
    await db.insert(orderStatusLogs).values({
      ...tenantInsert(),
      order_id: orderId,
      status,
      changed_by: updatedBy,
    });
  }

  private async markFoodItemsReady(orderId: string) {
    const order = await this.findById(orderId);
    if (!order) return;
    await this.updateStatus(orderId, "ready");
  }

  private async loadOrderItems(
    orderId: string,
    itemType?: string,
    client: any = db,
  ) {
    const conditions = [eq(order_items.order_id, orderId)] as any[];
    if (itemType) conditions.push(eq(order_items.item_type, itemType));

    const rows = await client
      .select({
        item: order_items,
        menu: menuItems,
      })
      .from(order_items)
      .leftJoin(menuItems, eq(order_items.menu_item_id, menuItems.id))
      .where(and(...conditions))
      .orderBy(asc(order_items.id));

    return rows.map((row: any) => ({
      ...row.item,
      menu_item_name: row.menu?.name,
      name: row.menu?.name ?? row.item?.name,
      main_category: row.item?.main_category ?? row.menu?.main_category ?? row.menu?.category,
    }));
  }

  private toOrderResponse(order: any, employee: any, items: any[]) {
    return {
      ...order,
      employee_name: this.formatEmployeeName(employee),
      items,
    };
  }

  private formatEmployeeName(employee: any) {
    if (!employee) return null;
    return [employee.first_name, employee.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }
}
