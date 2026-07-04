import { Injectable, BadRequestException } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
import {
  requireBranchId,
  requireBusinessId,
  tenantInsert,
} from "../../common/tenant/tenant-context";
import { OrdersGateway } from "./orders.gateway";
import {
  ORDER_STATUS_PRIORITY,
  normalizeOrderStatus,
  normalizePaymentStatus,
  normalizePaymentRowStatus,
} from "../../common/status/order-status.constants";

// Second alias on the users table so a single query can join both the waiter
// (orders.employee_id) and the cashier who rang the order up on their behalf
// (orders.cashier_id) without the two joins colliding.
const cashierUsers = alias(users, "cashier_user");

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
    return organizationId == null || organizationId === ""
      ? null
      : String(organizationId);
  }

  private validateUserId(
    userId: string,
    validUserIds: Set<string>,
    fallbackId?: string,
  ): string | null {
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
      subtotal:
        Number(item.subtotal) ||
        Number(item.unit_price) * Number(item.quantity),
      item_type: item.item_type || "food",
      main_category: item.main_category,
      note: item.note || null,
    }));
  }

  private isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid,
    );
  }

  /**
   * Atomically reserve the next order serial for a branch. Runs inside the
   * caller's transaction; the upsert row-locks the counter so concurrent
   * creates can't hand out the same number.
   */
  private async nextOrderNumber(tx: any, branchId: string): Promise<number> {
    const result = await tx.execute(sql`
      INSERT INTO order_counters (branch_id, last_number)
      VALUES (${branchId}, 1)
      ON CONFLICT (branch_id)
      DO UPDATE SET last_number = order_counters.last_number + 1
      RETURNING last_number
    `);
    const row = (result as any)?.rows?.[0];
    return Number(row?.last_number ?? 0);
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
      waiter_id,
      created_by_id,
      cashier_id,
      customer_id,
      table_number,
      type,
      items,
      total_amount,
      notes,
      organization_id,
      is_price_override,
    } = orderData;

    // The waiter the order belongs to (defaults to the employee on the order).
    const finalWaiterId = waiter_id || employee_id;
    // An order is "placed by a cashier" when whoever created it differs from the
    // waiter it's attributed to. Waiters placing their own orders leave this null.
    const finalCashierId =
      cashier_id ||
      (created_by_id && created_by_id !== finalWaiterId ? created_by_id : null);

    const safeTableNumber = this.normalizeTableNumber(table_number);
    const safeOrganizationId = this.normalizeOrganizationId(organization_id);

    if (type === "cafe" || !type) {
      const requireTableSelection = await this.isTableSelectionRequired();
      if (
        requireTableSelection &&
        (safeTableNumber == null ||
          isNaN(parseInt(String(safeTableNumber), 10)))
      ) {
        throw new BadRequestException(
          "Table selection is required for cafe orders.",
        );
      }
    }

    const createdOrder = await db.transaction(async (tx: any) => {
      const order_number = await this.nextOrderNumber(tx, requireBranchId());
      const [order] = await tx
        .insert(orders)
        .values({
          ...tenantInsert(),
          ...(orderData.id ? { id: orderData.id } : {}),
          order_number,
          customer_id: customer_id || randomUUID(),
          employee_id,
          waiter_id: finalWaiterId,
          cashier_id: finalCashierId,
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
        await tx
          .insert(order_items)
          .values(this.mapOrderItems(items, order.id));
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

  private async syncOrder(
    orderData: any,
    validUserIds: Set<string>,
    syncUserId: string,
    tx: any,
  ) {
    const {
      id,
      employee_id,
      waiter_id,
      created_by_id,
      cashier_id,
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

    const finalEmployeeId = this.validateUserId(
      employee_id,
      validUserIds,
      syncUserId,
    );

    if (!finalEmployeeId) {
      console.warn(
        `[BulkSync] Skipping order ${id}: employee_id ${employee_id} not found in valid users`,
      );
      // Report the skip so the client keeps this order unsynced and retries it
      // later (e.g. once its employee has synced) instead of silently dropping it.
      return { id, skipped: true as const };
    }
    const finalWaiterId = this.validateUserId(
      waiter_id,
      validUserIds,
      finalEmployeeId,
    );
    // Cashier-placed orders carry a creator distinct from the waiter; keep it
    // only when it's a known user and actually differs from the waiter.
    const incomingCashierId =
      cashier_id ||
      (created_by_id && created_by_id !== finalWaiterId ? created_by_id : null);
    const finalCashierId = incomingCashierId
      ? this.validateUserId(incomingCashierId, validUserIds)
      : null;
    const safeTableNumber = this.normalizeTableNumber(table_number);
    const safeOrganizationId = this.normalizeOrganizationId(organization_id);

    // The id existence check must NOT be branch-scoped: `orders.id` is a global
    // primary key, so an id can only ever belong to one row regardless of
    // branch. Scoping this by branch_id produced false negatives for orders that
    // already exist under another tenant (e.g. seed-tenant leftovers re-synced
    // into a real branch), which then fell through to an INSERT and crashed the
    // whole bulk-sync batch with a duplicate-key (orders_pkey) violation.
    const [existingOrder] = id
      ? await tx
          .select({
            id: orders.id,
            status: orders.status,
            branch_id: orders.branch_id,
          })
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1)
      : [];

    // Same id, but the row lives under a different branch — almost always a
    // seed/template order carrying a reused PK. Don't touch it and don't try to
    // re-insert it; report it as persisted so the client stops retrying.
    if (existingOrder && existingOrder.branch_id !== requireBranchId()) {
      console.warn(
        `[BulkSync] Order ${id} already exists under branch ${existingOrder.branch_id}, not ${requireBranchId()}; treating as persisted to avoid a duplicate-key crash.`,
      );
      return { id, exists: true as const };
    }

    if (existingOrder) {
      // Lifecycle priority: cancelled (terminal) > done > pending. Only update
      // the existing order if the incoming status outranks the current one.
      // Legacy clients may still send overloaded values (paid/voided/...); fold
      // them into the canonical vocab before comparing.
      const incomingStatus = normalizeOrderStatus(status);
      const existingStatus = normalizeOrderStatus(existingOrder.status);
      const incomingPriority = ORDER_STATUS_PRIORITY[incomingStatus];
      const existingPriority = ORDER_STATUS_PRIORITY[existingStatus];

      if (incomingPriority > existingPriority) {
        const isVoid = incomingStatus === "cancelled";
        // A legacy "paid" lifecycle implied money was collected; derive the
        // payment axis from it when the client didn't send one explicitly.
        const legacyPaid = String(status || "").toLowerCase() === "paid";
        await tx
          .update(orders)
          .set({
            status: incomingStatus,
            payment_status: isVoid
              ? "cancelled"
              : payment_status
                ? normalizePaymentStatus(payment_status)
                : legacyPaid
                  ? "paid"
                  : undefined,
            updated_at: new Date(),
          })
          .where(
            and(eq(orders.id, id), eq(orders.branch_id, requireBranchId())),
          );
        if (isVoid) {
          // Void this order's payments too, matching the online cancel path, so
          // no "paid" payment lingers for a cancelled order.
          await tx
            .update(payments)
            .set({ status: "cancelled", updated_at: new Date() })
            .where(
              and(
                eq(payments.order_id, id),
                eq(payments.branch_id, requireBranchId()),
              ),
            );
        }
        console.log(
          `[BulkSync] Updated existing order ${id} status: "${existingStatus}" → "${incomingStatus}"`,
        );
      } else if (incomingStatus !== existingStatus) {
        console.log(
          `[BulkSync] Skipping status downgrade for order ${id}: "${existingStatus}" (existing) ≥ "${incomingStatus}" (incoming)`,
        );
      }

      // Already on the server — report it as persisted so the client can safely
      // mark it synced (idempotent re-push).
      return { id, exists: true as const };
    }

    const order_number = await this.nextOrderNumber(tx, requireBranchId());
    const [createdOrder] = await tx
      .insert(orders)
      .values({
        ...tenantInsert(),
        id,
        order_number,
        customer_id: customer_id || randomUUID(),
        employee_id: finalEmployeeId,
        waiter_id: finalWaiterId,
        cashier_id: finalCashierId,
        table_number: safeTableNumber,
        organization_id: safeOrganizationId,
        is_price_override: Boolean(is_price_override),
        type: type || "cafe",
        total_amount,
        status: normalizeOrderStatus(status),
        // Derive the payment axis from a legacy "paid" lifecycle when the client
        // didn't send one explicitly; otherwise fold to the canonical vocab.
        payment_status: payment_status
          ? normalizePaymentStatus(payment_status)
          : String(status || "").toLowerCase() === "paid"
            ? "paid"
            : "pending",
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
        if (typeof menuItemId === "string" && this.isValidUUID(menuItemId))
          return true;
        console.warn(
          `[BulkSync] Skipping item with invalid menu_item_id: ${menuItemId}`,
        );
        return false;
      });

      // Collect all referenced menu_item_ids and check which ones exist in the DB
      const referencedMenuItemIds = validItems
        .map((item: any) => item.menu_item_id)
        .filter((id: any) => id != null && id !== "");

      const existingMenuItemIds = new Set<string>();
      if (referencedMenuItemIds.length > 0) {
        const existingRows = await tx
          .select({ id: menuItems.id })
          .from(menuItems)
          .where(inArray(menuItems.id, referencedMenuItemIds));
        existingRows.forEach((r: any) => existingMenuItemIds.add(r.id));
      }

      const orderItemsToInsert = validItems.map((item: any) => {
        const menuItemId =
          item.menu_item_id && item.menu_item_id !== ""
            ? item.menu_item_id
            : null;
        // If the menu_item_id doesn't exist in DB, set to null to avoid FK violation
        const safeMenuItemId =
          menuItemId && existingMenuItemIds.has(menuItemId) ? menuItemId : null;
        if (menuItemId && !safeMenuItemId) {
          console.warn(
            `[BulkSync] menu_item_id ${menuItemId} not found in DB — setting to null for order item`,
          );
        }
        return {
          ...tenantInsert(),
          id: item.id || randomUUID(),
          order_id: createdOrder.id,
          menu_item_id: safeMenuItemId,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal:
            Number(item.subtotal) ||
            Number(item.unit_price) * Number(item.quantity),
          item_type: item.item_type || "food",
          main_category: item.main_category,
          note: item.note || null,
        };
      });

      if (orderItemsToInsert.length > 0) {
        try {
          await tx.insert(order_items).values(orderItemsToInsert);
        } catch (insertErr) {
          console.error(
            `[BulkSync] Failed to insert order_items for order ${createdOrder.id}:`,
            (insertErr as Error)?.message,
          );
        }
      }
    }

    // An order can arrive at the server already paid (created and paid offline
    // before sync). Reconcile the stock sale when the payment axis says paid —
    // tolerate legacy clients that still encode "paid" in the lifecycle status.
    const arrivedPaid =
      normalizePaymentStatus(payment_status) === "paid" ||
      String(status || "").toLowerCase() === "paid";
    if (arrivedPaid) {
      const syncedItems = await this.loadOrderItems(
        createdOrder.id,
        undefined,
        tx,
      );
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

    return { id: createdOrder.id, order_number };
  }

  private async syncPayment(
    paymentData: any,
    validUserIds: Set<string>,
    syncUserId: string,
    tx: any,
  ) {
    const {
      id,
      order_id,
      amount,
      payment_method,
      status,
      processed_by,
      paid_at,
      created_at,
      description,
    } = paymentData;

    if (!order_id) {
      console.warn(`[BulkSync] Skipping payment ${id}: no order_id provided`);
      return;
    }

    const [verifiedOrder] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(eq(orders.id, order_id), eq(orders.branch_id, requireBranchId())),
      );
    if (!verifiedOrder) {
      console.warn(
        `[BulkSync] Skipping payment ${id}: Order ${order_id} not found in DB.`,
      );
      return;
    }

    const finalProcessedBy = this.validateUserId(
      processed_by,
      validUserIds,
      syncUserId,
    );

    // A payment row only exists because money was confirmed, so it is never
    // "pending": fold any legacy/pending value to paid (or cancelled).
    const resolvedStatus = normalizePaymentRowStatus(status);

    // Idempotency guard against duplicate payments for the same order. The
    // onConflictDoUpdate below only dedups by payment `id`; two pushes with
    // DIFFERENT ids but the same order_id (a re-appearing order paid twice, or
    // two devices) would otherwise both insert and double-count revenue. Skip
    // this push when a non-cancelled payment already exists for the order.
    //
    // This only applies to full-order payments. The web cashier portal settles
    // an order across several department-scoped rows (meta.scope = "department"),
    // which are legitimately multiple payments per order and must not be blocked.
    const isDepartmentScoped =
      String((paymentData?.meta as any)?.scope || "") === "department";
    if (resolvedStatus !== "cancelled" && !isDepartmentScoped) {
      const [duplicate] = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(
            eq(payments.order_id, order_id),
            eq(payments.branch_id, requireBranchId()),
            ne(payments.id, id),
            ne(payments.status, "cancelled"),
            sql`coalesce(${payments.meta} ->> 'scope', '') <> 'department'`,
          ),
        )
        .limit(1);
      if (duplicate) {
        console.warn(
          `[BulkSync] Skipping payment ${id}: order ${order_id} already has payment ${duplicate.id} (duplicate).`,
        );
        return;
      }
    }
    const resolvedPaidAt = paid_at ? new Date(paid_at) : new Date();

    await tx
      .insert(payments)
      .values({
        ...tenantInsert(),
        id,
        order_id,
        amount,
        amount_cents: amount,
        payment_method,
        method: payment_method,
        status: resolvedStatus,
        processed_by: finalProcessedBy,
        paid_at: resolvedPaidAt,
        created_at: resolvedPaidAt,
        description: description || null,
        meta: {},
      })
      // A payment can reach the server twice: once as "pending" when it is
      // first created online, then again as "paid" after it is confirmed (the
      // dedicated confirm call can fail or race). Without this upsert the
      // second push hits a primary-key conflict (409) and the corrected status
      // is silently dropped, leaving a confirmed order stuck as "pending".
      .onConflictDoUpdate({
        target: payments.id,
        set: {
          status: resolvedStatus,
          payment_method,
          method: payment_method,
          processed_by: finalProcessedBy,
          paid_at: resolvedPaidAt,
          updated_at: new Date(),
        },
      });

    if (resolvedStatus === "paid") {
      // A cancellation is terminal. If this order was voided (e.g. by the web
      // cashier) while an offline POS still held it as paid, the late-syncing
      // "paid" payment must NOT resurrect the order. Keep it cancelled, void this
      // stray payment so it doesn't count as revenue, and skip the stock sale.
      const [orderRow] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(
          and(eq(orders.id, order_id), eq(orders.branch_id, requireBranchId())),
        )
        .limit(1);

      if (normalizeOrderStatus(orderRow?.status) === "cancelled") {
        await tx
          .update(payments)
          .set({ status: "cancelled", updated_at: new Date() })
          .where(eq(payments.id, id));
        console.log(
          `[BulkSync] Order ${order_id} is cancelled; not marking paid from synced payment ${id} (payment voided).`,
        );
        return;
      }

      const [existingSaleMovement] = await tx
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.order_id, order_id),
            eq(stockMovements.movement_type, "sale"),
          ),
        )
        .limit(1);

      // Payment is the completion event in this POS, so it closes the order:
      // lifecycle -> done, money -> paid.
      await tx
        .update(orders)
        .set({ status: "done", payment_status: "paid", updated_at: new Date() })
        .where(
          and(eq(orders.id, order_id), eq(orders.branch_id, requireBranchId())),
        );

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
    const {
      orders: syncOrders = [],
      payments: syncPayments = [],
      user_id: syncUserId,
    } = data;

    console.log(
      `[OrderService] Starting bulk sync: ${syncOrders.length} orders, ${syncPayments.length} payments`,
    );

    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.business_id, requireBusinessId()));
    const validUserIds = new Set(userRows.map((u) => u.id));

    // `orders` keeps its original shape (newly-created orders + assigned serial)
    // for the immediate-create path. `persisted_ids` lists every order the
    // server is guaranteed to be holding (created OR already-present) so the
    // client only marks those as synced; `skipped_ids` are the ones it must keep
    // unsynced and retry — this is what prevents offline orders from vanishing.
    const orderResults: Array<{ id: string; order_number: number }> = [];
    const persistedIds: string[] = [];
    const skippedIds: string[] = [];
    await db.transaction(async (tx: any) => {
      for (const orderData of syncOrders) {
        let result: any;
        try {
          // Run each order inside its own savepoint (nested transaction) so an
          // unexpected failure on one order rolls back only that order instead
          // of aborting — and re-poisoning — the entire batch. Without this, a
          // single bad row makes every other order in the push fail too, and the
          // client retries the same doomed batch forever.
          result = await tx.transaction((sp: any) =>
            this.syncOrder(orderData, validUserIds, syncUserId, sp),
          );
        } catch (error) {
          console.error(
            `[OrderService] bulk sync failed for order ${orderData?.id}; skipping it so the rest of the batch still commits:`,
            (error as Error)?.message,
          );
          if (orderData?.id) skippedIds.push(orderData.id);
          continue;
        }
        if (!result?.id) continue;
        if ("skipped" in result && result.skipped) {
          skippedIds.push(result.id);
          continue;
        }
        persistedIds.push(result.id);
        if ("order_number" in result && result.order_number != null) {
          orderResults.push({
            id: result.id,
            order_number: result.order_number,
          });
        }
      }

      for (const paymentData of syncPayments) {
        try {
          await tx.transaction((sp: any) =>
            this.syncPayment(paymentData, validUserIds, syncUserId, sp),
          );
        } catch (error) {
          console.error(
            `[OrderService] bulk sync failed for payment ${paymentData?.id}; skipping it so the rest of the batch still commits:`,
            (error as Error)?.message,
          );
        }
      }
    });

    if (skippedIds.length > 0) {
      console.warn(
        `[OrderService] bulk sync skipped ${skippedIds.length} order(s):`,
        skippedIds,
      );
    }

    return {
      orders: orderResults,
      persisted_ids: persistedIds,
      skipped_ids: skippedIds,
    };
  }

  async findById(id: string) {
    const [orderRow] = await db
      .select({
        order: orders,
        employee: users,
        cashier: cashierUsers,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .leftJoin(cashierUsers, eq(orders.cashier_id, cashierUsers.id))
      .where(and(eq(orders.id, id), eq(orders.branch_id, requireBranchId())))
      .limit(1);

    if (!orderRow) return null;

    const items = await this.loadOrderItems(id);
    return this.toOrderResponse(
      orderRow.order,
      orderRow.employee,
      items,
      orderRow.cashier,
    );
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
        cashier: cashierUsers,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .leftJoin(cashierUsers, eq(orders.cashier_id, cashierUsers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.created_at));

    // Batch-load every order's items in a single query and group in memory,
    // instead of one query per order (an N+1 that made this endpoint scale
    // linearly with the number of orders).
    const itemsByOrder = await this.loadItemsForOrders(
      rows.map((r) => r.order.id),
    );

    return rows.map((row) =>
      this.toOrderResponse(
        row.order,
        row.employee,
        itemsByOrder.get(row.order.id) ?? [],
        row.cashier,
      ),
    );
  }

  /**
   * Load order_items for many orders at once and bucket them by order_id.
   * Replaces per-order loadOrderItems calls in list endpoints.
   */
  private async loadItemsForOrders(
    orderIds: string[],
  ): Promise<Map<string, any[]>> {
    const byOrder = new Map<string, any[]>();
    if (orderIds.length === 0) return byOrder;

    const rows = await db
      .select({
        item: order_items,
        menu: menuItems,
      })
      .from(order_items)
      .leftJoin(menuItems, eq(order_items.menu_item_id, menuItems.id))
      .where(inArray(order_items.order_id, orderIds))
      .orderBy(asc(order_items.id));

    for (const row of rows) {
      const mapped = {
        ...row.item,
        menu_item_name: row.menu?.name,
        name: row.menu?.name ?? (row.item as any)?.name,
        main_category:
          row.item?.main_category ??
          row.menu?.main_category ??
          (row.menu as any)?.category,
      };
      const list = byOrder.get(row.item.order_id);
      if (list) list.push(mapped);
      else byOrder.set(row.item.order_id, [mapped]);
    }

    return byOrder;
  }

  /**
   * Expand a filter value into a Date. A bare yyyy-mm-dd is treated as a local
   * day boundary (start or end) so a single-day "to" still includes that day.
   */
  private parseDateBound(value: string, end: boolean): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
    }
    return new Date(value);
  }

  /**
   * Paginated, date-windowed order list for the dashboard. Returns the page of
   * rows plus the total matching count and summary stats computed server-side
   * over the *whole* window (not just the page) so the stat cards stay correct.
   *
   * Pagination and the default date window are opt-in: a caller that passes
   * neither `page`/`limit` nor an explicit date range gets the full unwindowed
   * history (the behaviour the heavier aggregation pages still rely on).
   */
  async findAllPaged(filters: any) {
    const branchId = requireBranchId();
    const paginate = filters.page != null || filters.limit != null;
    const hasExplicitDates = filters.date_from != null || filters.date_to != null;

    const conditions = [eq(orders.branch_id, branchId)] as any[];

    // Default to a 30-day window only when paginating without explicit dates,
    // so the dashboard list never scans the whole history on first paint.
    let from: Date | null = null;
    let to: Date | null = null;
    if (hasExplicitDates || paginate) {
      to = filters.date_to ? this.parseDateBound(filters.date_to, true) : new Date();
      from = filters.date_from
        ? this.parseDateBound(filters.date_from, false)
        : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      conditions.push(gte(orders.created_at, from));
      conditions.push(lte(orders.created_at, to));
    }

    if (filters.status) conditions.push(eq(orders.status, filters.status));
    if (filters.type) conditions.push(eq(orders.type, filters.type));
    if (filters.employee_id)
      conditions.push(eq(orders.employee_id, filters.employee_id));
    if (filters.table_number)
      conditions.push(eq(orders.table_number, filters.table_number));
    if (filters.paid === "paid")
      conditions.push(sql`${orders.payment_status} = 'paid'`);
    else if (filters.paid === "unpaid")
      conditions.push(sql`coalesce(${orders.payment_status}, '') <> 'paid'`);

    const search = String(filters.search ?? "").trim().toLowerCase();
    if (search) {
      const like = `%${search}%`;
      conditions.push(sql`(
        lower(coalesce(${orders.status}, '')) like ${like}
        or lower(coalesce(${orders.type}, '')) like ${like}
        or lower(coalesce(${orders.payment_status}, '')) like ${like}
        or cast(${orders.order_number} as text) like ${like}
        or lower(
          coalesce(${users.first_name}, '') || ' ' || coalesce(${users.last_name}, '')
        ) like ${like}
      )`);
    }

    const where = and(...conditions);
    const paid = sql`${orders.payment_status} = 'paid'`;
    const notVoided = sql`${orders.status} <> 'cancelled'`;
    // Anything not yet paid counts as outstanding. Many orders only carry
    // status='pending' with an empty/null payment_status (they never went
    // through the payment axis), so keying off payment_status = 'pending'
    // alone drops them. Match the "unpaid" list filter: not paid, not voided.
    const unpaid = sql`coalesce(${orders.payment_status}, '') <> 'paid'`;

    const [agg] = await db
      .select({
        total: count(),
        collected: sql<number>`coalesce(sum(case when ${notVoided} and ${paid} then coalesce(${orders.total_amount}, 0) else 0 end), 0)`,
        outstanding: sql<number>`coalesce(sum(case when ${notVoided} and ${unpaid} then coalesce(${orders.total_amount}, 0) else 0 end), 0)`,
        pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(where);

    const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 100);
    const page = Math.max(Number(filters.page) || 1, 1);

    // Whitelist of columns the client may sort by; anything else falls back to
    // the default newest-first ordering.
    const SORTABLE: Record<string, any> = {
      total_amount: orders.total_amount,
      created_at: orders.created_at,
      table_number: orders.table_number,
      order_number: orders.order_number,
    };
    const sortCol = SORTABLE[filters.sort_by as string];
    const dir = filters.sort_dir === "asc" ? asc : desc;
    const orderBy = sortCol
      ? [dir(sortCol), desc(orders.created_at)]
      : [desc(orders.created_at)];

    const baseQuery = db
      .select({ order: orders, employee: users, cashier: cashierUsers })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .leftJoin(cashierUsers, eq(orders.cashier_id, cashierUsers.id))
      .where(where)
      .orderBy(...orderBy);

    const rows = paginate
      ? await baseQuery.limit(limit).offset((page - 1) * limit)
      : await baseQuery;

    const itemsByOrder = await this.loadItemsForOrders(
      rows.map((r) => r.order.id),
    );
    const list = rows.map((row) =>
      this.toOrderResponse(
        row.order,
        row.employee,
        itemsByOrder.get(row.order.id) ?? [],
        row.cashier,
      ),
    );

    return {
      orders: list,
      count: Number(agg?.total ?? 0),
      page: paginate ? page : 1,
      limit: paginate ? limit : Number(agg?.total ?? 0),
      window:
        from && to
          ? { from: from.toISOString(), to: to.toISOString() }
          : null,
      stats: {
        total_orders: Number(agg?.total ?? 0),
        collected: Number(agg?.collected ?? 0),
        outstanding: Number(agg?.outstanding ?? 0),
        pending: Number(agg?.pending ?? 0),
      },
    };
  }

  async updateStatus(id: string, status: string, updatedBy?: any) {
    const branchId = requireBranchId();
    const nextStatus = normalizeOrderStatus(status);
    const isCancel = nextStatus === "cancelled";

    const updated = await db.transaction(async (tx: any) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.branch_id, branchId)))
        .limit(1);

      // Cancelling voids the order: also clear any paid/partially-paid state so
      // the back-office and POS don't keep showing it as "paid" (they key off
      // payment_status), and so it leaves every cashier queue.
      const setFields: any = { status: nextStatus, updated_at: new Date() };
      if (isCancel) setFields.payment_status = "cancelled";

      const [updated] = await tx
        .update(orders)
        .set(setFields)
        .where(and(eq(orders.id, id), eq(orders.branch_id, branchId)))
        .returning();

      if (updated) {
        const wasPaid =
          normalizePaymentStatus(existingOrder?.payment_status) === "paid";

        if (
          isCancel &&
          normalizeOrderStatus(existingOrder?.status) !== "cancelled" &&
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

        // Void every payment on a cancelled order so it stops counting as paid /
        // as revenue anywhere (payments page, recent-payments panel, reports).
        // Without this the original "paid" payment lingers and the POS — which
        // reads payments from the backend — keeps showing the order as paid.
        if (isCancel) {
          await tx
            .update(payments)
            .set({ status: "cancelled", updated_at: new Date() })
            .where(
              and(
                eq(payments.order_id, id),
                eq(payments.branch_id, branchId),
              ),
            );
        }

        await this.logStatusChange(id, nextStatus, updatedBy);
        const full = await this.findById(id);
        if (full) {
          await emitUpdated(tx, "order", "ORDER_UPDATED", full as any);
        }
      }

      return updated;
    });

    // Realtime push so a POS — which reads orders from its own local DB — reflects
    // the cancellation/status change instantly instead of waiting for a sync pull.
    if (updated) {
      try {
        const full = await this.findById(id);
        if (full) {
          this.ordersGateway.notifyOrderUpdated((full as any).branch_id, full);
        }
      } catch (err) {
        console.warn(
          `[OrderService] Realtime order push failed for order ${id}`,
          (err as Error)?.message,
        );
      }
    }

    return updated;
  }

  async getStatusHistory(id: string) {
    const rows = await db
      .select({
        log: orderStatusLogs,
        user: users,
      })
      .from(orderStatusLogs)
      .leftJoin(users, eq(orderStatusLogs.changed_by, users.id))
      .where(
        and(
          eq(orderStatusLogs.order_id, id),
          eq(orderStatusLogs.branch_id, requireBranchId()),
        ),
      )
      .orderBy(desc(orderStatusLogs.changed_at));

    return rows.map((row: any) => ({
      ...row.log,
      changed_by_name: this.formatEmployeeName(row.user),
    }));
  }

  async getPendingOrders(type?: string) {
    const conditions = [
      eq(orders.branch_id, requireBranchId()),
      eq(orders.status, "pending"),
    ] as any[];
    if (type) conditions.push(eq(orders.type, type));

    const rows = await db
      .select({
        order: orders,
        employee: users,
        cashier: cashierUsers,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .leftJoin(cashierUsers, eq(orders.cashier_id, cashierUsers.id))
      .where(and(...conditions))
      .orderBy(asc(orders.created_at));

    const itemsByOrder = await this.loadItemsForOrders(
      rows.map((r) => r.order.id),
    );
    return rows.map((row) =>
      this.toOrderResponse(
        row.order,
        row.employee,
        itemsByOrder.get(row.order.id) ?? [],
        row.cashier,
      ),
    );
  }

  async getReadyOrders(type?: string) {
    const conditions = [
      eq(orders.branch_id, requireBranchId()),
      eq(orders.status, "done"),
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
      .orderBy(asc(orders.updated_at));

    const itemsByOrder = await this.loadItemsForOrders(
      rows.map((r) => r.order.id),
    );
    return rows.map((row) =>
      this.toOrderResponse(
        row.order,
        row.employee,
        itemsByOrder.get(row.order.id) ?? [],
      ),
    );
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
          eq(orders.branch_id, requireBranchId()),
          eq(orders.type, "cafe"),
          eq(orders.status, "pending"),
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
    // Lifecycle collapsed to {pending, done, cancelled}: "ready" is "done".
    const updated = await this.updateStatus(id, "done", updatedBy);
    return updated;
  }

  async completeOrder(id: string, completedBy?: any) {
    return this.updateStatus(id, "done", completedBy);
  }

  async getOrdersForPayment(filters: any) {
    return this.findAll(filters);
  }

  /**
   * Active orders awaiting payment, enriched for the web cashier portal with a
   * per-department breakdown so a department-attached cashier can settle only
   * their share. A "department" is the `main_category` carried on each order
   * item. When `departments` is provided, only orders that still have an
   * unsettled due in one of those departments are returned, and the item/dues
   * lists are trimmed to those departments so other departments' lines and
   * totals never leak to a scoped cashier.
   */
  async getCashierQueue(filters: { departments?: string[]; employee_id?: string }) {
    const branchId = requireBranchId();
    const wanted = (filters.departments ?? [])
      .map((d) => String(d || "").trim().toLowerCase())
      .filter(Boolean);

    const conditions = [
      eq(orders.branch_id, branchId),
      sql`coalesce(${orders.payment_status}, '') <> 'paid'`,
      sql`coalesce(${orders.status}, '') <> 'cancelled'`,
    ] as any[];
    if (filters.employee_id) {
      conditions.push(eq(orders.employee_id, filters.employee_id));
    }

    const rows = await db
      .select({ order: orders, employee: users })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.created_at));

    const orderIds = rows.map((r) => r.order.id);
    const itemsByOrder = await this.loadItemsForOrders(orderIds);

    // Departments already settled per order (paid department-scoped payments).
    const settledByOrder = new Map<string, Set<string>>();
    if (orderIds.length > 0) {
      const payRows = await db
        .select({ order_id: payments.order_id, meta: payments.meta })
        .from(payments)
        .where(
          and(
            eq(payments.branch_id, branchId),
            inArray(payments.order_id, orderIds),
            eq(payments.status, "paid"),
          ),
        );
      for (const p of payRows) {
        const meta = (p.meta ?? {}) as any;
        if (meta?.scope !== "department") continue;
        const dept = String(meta?.department || "").trim().toLowerCase();
        if (!dept) continue;
        const set = settledByOrder.get(p.order_id) ?? new Set<string>();
        set.add(dept);
        settledByOrder.set(p.order_id, set);
      }
    }

    const deptOf = (it: any) =>
      String(it?.main_category || "").trim().toLowerCase() || "other";

    const result: any[] = [];
    for (const row of rows) {
      const items = itemsByOrder.get(row.order.id) ?? [];
      const settled = settledByOrder.get(row.order.id) ?? new Set<string>();

      const dueMap = new Map<
        string,
        { department: string; subtotal: number; settled: boolean }
      >();
      for (const it of items) {
        const dept = deptOf(it);
        const cur =
          dueMap.get(dept) ??
          { department: dept, subtotal: 0, settled: settled.has(dept) };
        cur.subtotal += Number(it?.subtotal ?? 0) || 0;
        dueMap.set(dept, cur);
      }
      let dues = Array.from(dueMap.values());

      let visibleItems = items;
      if (wanted.length > 0) {
        dues = dues.filter((d) => wanted.includes(d.department));
        // Skip orders with nothing left for this cashier's departments.
        if (!dues.some((d) => !d.settled)) continue;
        visibleItems = items.filter((it) => wanted.includes(deptOf(it)));
      }

      result.push({
        ...this.toOrderResponse(row.order, row.employee, visibleItems),
        settled_departments: Array.from(settled),
        department_dues: dues,
      });
    }

    return result;
  }

  async updateOrderItems(id: string, items: any[], updatedBy?: any) {
    const allowLowStock = await this.isLowStockAllowed();
    const branchId = requireBranchId();
    return db.transaction(async (tx: any) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.branch_id, branchId)))
        .limit(1);
      if (!existingOrder) return null;
      const wasPaid =
        normalizePaymentStatus(existingOrder?.payment_status) === "paid";
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
        .where(and(eq(orders.id, id), eq(orders.branch_id, branchId)));

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
    const branchId = requireBranchId();
    return db.transaction(async (tx: any) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.branch_id, branchId)))
        .limit(1);
      if (!existingOrder) return null;
      const wasPaid =
        normalizePaymentStatus(existingOrder?.payment_status) === "paid";
      const previousItems = await this.loadOrderItems(id, undefined, tx);
      const [order] = await tx
        .select({ total_amount: orders.total_amount })
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.branch_id, branchId)))
        .limit(1);

      const currentTotal = Number(order?.total_amount || 0);
      let additionalTotal = 0;

      for (const item of items) {
        const [existingItem] = await tx
          .select()
          .from(order_items)
          .where(
            and(
              eq(order_items.order_id, id),
              eq(order_items.menu_item_id, item.menu_item_id),
            ),
          )
          .limit(1);

        const itemSubtotal = Number(item.unit_price) * Number(item.quantity);
        additionalTotal += itemSubtotal;

        if (existingItem) {
          const newQuantity =
            Number(existingItem.quantity) + Number(item.quantity);
          await tx
            .update(order_items)
            .set({
              quantity: newQuantity,
              subtotal: Number(item.unit_price) * newQuantity,
            })
            .where(
              and(
                eq(order_items.order_id, id),
                eq(order_items.menu_item_id, item.menu_item_id),
              ),
            );
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
        .set({
          total_amount: currentTotal + additionalTotal,
          updated_at: new Date(),
        })
        .where(and(eq(orders.id, id), eq(orders.branch_id, branchId)));

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
      .where(
        and(eq(orders.branch_id, requireBranchId()), eq(orders.type, "cafe")),
      );

    const filtered = rows.filter((row: any) => {
      if (orderType === "beverage_only") {
        return row.order.status === "done";
      }
      if (orderType === "kitchen") {
        return row.order.status === "pending";
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
          eq(orders.branch_id, requireBranchId()),
          eq(orders.type, "cafe"),
          // Active orders still holding a table: everything not yet finished
          // or cancelled. With the collapsed lifecycle that is just "pending".
          eq(orders.status, "pending"),
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
    // "ready" collapsed into the "done" lifecycle state.
    await this.updateStatus(orderId, "done");
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
      main_category:
        row.item?.main_category ??
        row.menu?.main_category ??
        row.menu?.category,
    }));
  }

  private toOrderResponse(
    order: any,
    employee: any,
    items: any[],
    cashier?: any,
  ) {
    // Surface who placed the order so clients can show "Cashier" vs "Waiter".
    // cashier_id is only set when a cashier rang up an order on a waiter's behalf.
    const orderSource = order?.cashier_id ? "cashier" : "waiter";
    return {
      ...order,
      // Mirror cashier_id into created_by_id so existing clients (which key off
      // created_by_id !== waiter_id) keep working for server-fetched orders.
      created_by_id:
        order?.created_by_id ?? order?.cashier_id ?? order?.waiter_id ?? null,
      order_source: orderSource,
      employee_name: this.formatEmployeeName(employee),
      employee_role: employee?.role ?? null,
      // Name of the cashier who placed the order on the waiter's behalf, when
      // applicable. Null for orders a waiter placed for themselves.
      cashier_name: this.formatEmployeeName(cashier),
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
