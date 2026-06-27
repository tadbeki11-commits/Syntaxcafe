import { BadRequestException, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { order_items } from "../../db/tables/order-items.table";
import { orders } from "../../db/tables/orders.table";
import { payments } from "../../db/tables/payments.table";
import { stockMovements } from "../../db/tables/stock-movements.table";
import { users } from "../../db/tables/users.table";
import { OrderInventoryService } from "../order/order-inventory.service";
import { OrderService } from "../order/order.service";
import { OrdersGateway } from "../order/orders.gateway";
import { emitCreated, emitUpdated } from "../sync/sync-emit.util";
import {
  requireBranchId,
  tenantInsert,
} from "../../common/tenant/tenant-context";
import {
  normalizeOrderStatus,
  normalizePaymentRowStatus,
} from "../../common/status/order-status.constants";
const QRCode: any = require("qrcode");

@Injectable()
export class PaymentService {
  constructor(
    private readonly orderInventoryService: OrderInventoryService,
    private readonly orderService: OrderService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  /**
   * Best-effort realtime push of an order's latest state to every client
   * watching its branch (see OrdersGateway). Called after a payment changes an
   * order so a POS — which reads orders from its own local DB — reflects the
   * paid/partially-paid status instantly. Never throws: a failed push must not
   * fail the payment that already committed.
   */
  private async pushOrderUpdate(orderId: string | null | undefined) {
    if (!orderId) return;
    try {
      const order = await this.orderService.findById(orderId);
      if (order) {
        this.ordersGateway.notifyOrderUpdated((order as any).branch_id, order);
      }
    } catch (err) {
      console.warn(
        `[PaymentService] Realtime order push failed for order ${orderId}`,
        (err as Error)?.message,
      );
    }
  }

  async create(paymentData: any) {
    const {
      order_id,
      amount,
      payment_method,
      processed_by,
      description,
      status,
    } = paymentData;
    const branchId = requireBranchId();

    // A payment row exists only because money was confirmed, so recording one IS
    // the confirmation: it lands "paid" (and settles the order + deducts stock)
    // in a single step — no separate confirm pass, no "pending" row. The one
    // exception is a void/cancel ledger marker (the cashier portal sends a
    // legacy "deleted" status) which is recorded as "cancelled" without touching
    // the order, so it reads as voided on the POS and back-office.
    const resolvedStatus = normalizePaymentRowStatus(status);

    if (resolvedStatus === "cancelled") {
      const [voided] = await db
        .insert(payments)
        .values({
          ...tenantInsert(),
          order_id: order_id || null,
          amount,
          amount_cents: amount,
          payment_method,
          method: payment_method,
          status: "cancelled",
          processed_by,
          description: description || null,
        })
        .returning();
      if (voided) {
        await emitCreated(db, "payment", "PAYMENT_CREATED", voided as any);
      }
      return voided;
    }

    const { payment: created, isNew } = await db.transaction(
      async (tx: any) => {
        // Idempotency guard against duplicate full-order payments. A double-click,
        // a client retry of a request that actually succeeded, or two cashier
        // surfaces confirming the same order would otherwise each insert a fresh
        // row and double-charge. Department-split payments are exempt: those
        // legitimately produce several rows per order (one per department) and
        // are recorded via settleDepartment, which has its own per-dept guard.
        if (order_id) {
          const [existing] = await tx
            .select({ id: payments.id, status: payments.status })
            .from(payments)
            .where(
              and(
                eq(payments.order_id, order_id),
                eq(payments.branch_id, branchId),
                eq(payments.status, "paid"),
                sql`coalesce(${payments.meta} ->> 'scope', '') <> 'department'`,
              ),
            )
            .limit(1);
          if (existing) return { payment: existing, isNew: false };

          // A cancellation is terminal: never pay a cancelled order. Record the
          // money as a voided (cancelled) payment instead of resurrecting it.
          const [orderRow] = await tx
            .select({ status: orders.status })
            .from(orders)
            .where(
              and(eq(orders.id, order_id), eq(orders.branch_id, branchId)),
            )
            .limit(1);
          if (normalizeOrderStatus(orderRow?.status) === "cancelled") {
            const [voided] = await tx
              .insert(payments)
              .values({
                ...tenantInsert(),
                order_id,
                amount,
                amount_cents: amount,
                payment_method,
                method: payment_method,
                status: "cancelled",
                processed_by,
                description: description || null,
              })
              .returning();
            return { payment: voided, isNew: true };
          }
        }

        const [created] = await tx
          .insert(payments)
          .values({
            ...tenantInsert(),
            order_id: order_id || null,
            amount,
            amount_cents: amount,
            payment_method,
            method: payment_method,
            status: "paid",
            processed_by,
            paid_at: new Date(),
            description: description || null,
          })
          .returning();

        if (order_id) {
          // Payment is the completion event in this POS (no separate "served"
          // step), so it closes the order: lifecycle -> done, money -> paid.
          await tx
            .update(orders)
            .set({
              status: "done",
              payment_status: "paid",
              updated_at: new Date(),
            })
            .where(and(eq(orders.id, order_id), eq(orders.branch_id, branchId)));
          await this.deductOrderStock(tx, order_id, processed_by);
        }

        return { payment: created, isNew: true };
      },
    );

    if (created && isNew) {
      await emitCreated(db, "payment", "PAYMENT_CREATED", created as any);
      await this.pushOrderUpdate(order_id);
    }
    return created;
  }

  async findById(id: string) {
    const [row] = await db
      .select({
        payment: payments,
        order: orders,
        user: users,
      })
      .from(payments)
      .leftJoin(orders, eq(payments.order_id, orders.id))
      .leftJoin(users, eq(payments.processed_by, users.id))
      .where(
        and(eq(payments.id, id), eq(payments.branch_id, requireBranchId())),
      )
      .limit(1);

    if (!row) return undefined;

    return this.serializePayment(row.payment, row.order, row.user);
  }

  async findByOrderId(orderId: string) {
    const rows = await db
      .select({
        payment: payments,
        order: orders,
        user: users,
      })
      .from(payments)
      .leftJoin(orders, eq(payments.order_id, orders.id))
      .leftJoin(users, eq(payments.processed_by, users.id))
      .where(
        and(
          eq(payments.order_id, orderId),
          eq(payments.branch_id, requireBranchId()),
        ),
      )
      .orderBy(desc(payments.created_at));

    return rows.map((row: any) =>
      this.serializePayment(row.payment, row.order, row.user),
    );
  }

  async updateStatus(id: string, status: string, processedBy?: any) {
    const [updated] = await db
      .update(payments)
      .set({ status, processed_by: processedBy, updated_at: new Date() })
      .where(
        and(eq(payments.id, id), eq(payments.branch_id, requireBranchId())),
      )
      .returning();
    if (updated) {
      await emitUpdated(db, "payment", "PAYMENT_UPDATED", updated as any);
    }
    return updated;
  }

  async confirmPayment(id: string, processedBy?: any) {
    const branchId = requireBranchId();

    const payment = await db.transaction(async (tx: any) => {
      const [existing] = await tx
        .select({ order_id: payments.order_id, status: payments.status })
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.branch_id, branchId)))
        .limit(1);

      if (!existing) {
        throw new Error("Payment not found");
      }

      // Payments are now created already-paid (see create()), so confirm is
      // idempotent — but stay robust for legacy rows and conflicting calls.

      // A cancellation/void is terminal. If the order was voided (e.g. by the
      // web cashier) a late or conflicting confirm must not resurrect it — record
      // the payment as voided and leave the order cancelled.
      const [orderRow] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(
          and(eq(orders.id, existing.order_id), eq(orders.branch_id, branchId)),
        )
        .limit(1);
      if (normalizeOrderStatus(orderRow?.status) === "cancelled") {
        const [voided] = await tx
          .update(payments)
          .set({
            status: "cancelled",
            processed_by: processedBy,
            updated_at: new Date(),
          })
          .where(and(eq(payments.id, id), eq(payments.branch_id, branchId)))
          .returning();
        return voided;
      }

      const [payment] = await tx
        .update(payments)
        .set({
          status: "paid",
          processed_by: processedBy,
          paid_at: new Date(),
          updated_at: new Date(),
        })
        .where(and(eq(payments.id, id), eq(payments.branch_id, branchId)))
        .returning();

      // Payment closes the order: lifecycle -> done, money -> paid.
      await tx
        .update(orders)
        .set({ status: "done", payment_status: "paid", updated_at: new Date() })
        .where(
          and(eq(orders.id, payment.order_id), eq(orders.branch_id, branchId)),
        );

      await this.deductOrderStock(tx, payment.order_id, processedBy);

      return payment;
    });

    // Notify any POS watching this branch that the order state changed.
    await this.pushOrderUpdate(payment?.order_id);

    return payment;
  }

  /**
   * Deduct stock for every line of an order, once. Used when an order becomes
   * fully paid (either by a single full-order confirm or once the last
   * department's share is settled). Guarded by the existing "sale" stock movement
   * so re-runs are no-ops, and never blocks the payment on a shortfall — the food
   * has already been served, so a deficit just lets stock go negative as a
   * restock signal, mirroring the offline-sync create path.
   */
  private async deductOrderStock(
    tx: any,
    orderId: string,
    processedBy?: any,
  ): Promise<void> {
    const [existingSaleMovement] = await tx
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.order_id, orderId),
          eq(stockMovements.movement_type, "sale"),
        ),
      )
      .limit(1);

    if (existingSaleMovement) return;

    const orderLines = await tx
      .select({
        id: order_items.id,
        menu_item_id: order_items.menu_item_id,
        quantity: order_items.quantity,
        main_category: order_items.main_category,
        item_type: order_items.item_type,
      })
      .from(order_items)
      .where(eq(order_items.order_id, orderId));

    try {
      await this.orderInventoryService.reconcileOrderItems({
        tx,
        orderId,
        previousItems: [],
        nextItems: orderLines,
        createdBy: processedBy || null,
        allowLowStock: true,
      });
    } catch (error) {
      console.warn(
        `[deductOrderStock] Inventory reconciliation failed for order ${orderId}; payment is still recorded.`,
        (error as Error)?.message,
      );
    }
  }

  /**
   * Settle one department's share of an order. A department here is the
   * `main_category` carried on each order item (kitchen / bar / cafe …). An
   * order that spans several departments can be paid by several department
   * cashiers, each confirming only their slice; the order flips to fully paid
   * (and stock is deducted, once) only when every department present has been
   * settled. Until then it sits at `partially_paid` and stays in the cashier
   * queue for the remaining departments.
   */
  async settleDepartment(body: {
    order_id: string;
    department: string;
    payment_method?: string;
    processed_by?: string;
  }) {
    const branchId = requireBranchId();
    const orderId = body.order_id;
    const department = String(body.department || "")
      .trim()
      .toLowerCase();
    if (!orderId || !department) {
      throw new BadRequestException("order_id and department are required");
    }
    const method = body.payment_method || "cash";

    const result = await db.transaction(async (tx: any) => {
      const lines = await tx
        .select({
          subtotal: order_items.subtotal,
          main_category: order_items.main_category,
        })
        .from(order_items)
        .where(eq(order_items.order_id, orderId));

      if (!lines.length) {
        throw new BadRequestException("Order has no items");
      }

      const deptOf = (line: any) =>
        String(line?.main_category || "")
          .trim()
          .toLowerCase() || "other";

      const deptLines = lines.filter((l: any) => deptOf(l) === department);
      const deptSubtotal = deptLines.reduce(
        (sum: number, l: any) => sum + (Number(l.subtotal) || 0),
        0,
      );
      if (deptSubtotal <= 0) {
        throw new BadRequestException(
          `No payable items for department "${department}"`,
        );
      }

      // Which departments are already settled? A department-scoped paid payment
      // marks one department; a legacy full payment covers the whole order.
      const existingPaid = await tx
        .select({ meta: payments.meta })
        .from(payments)
        .where(
          and(
            eq(payments.order_id, orderId),
            eq(payments.branch_id, branchId),
            eq(payments.status, "paid"),
          ),
        );

      const settled = new Set<string>();
      let hasFullPayment = false;
      for (const p of existingPaid) {
        const meta = (p.meta ?? {}) as any;
        if (meta?.scope === "department") {
          const d = String(meta?.department || "")
            .trim()
            .toLowerCase();
          if (d) settled.add(d);
        } else {
          hasFullPayment = true;
        }
      }
      if (hasFullPayment || settled.has(department)) {
        throw new BadRequestException(
          `Department "${department}" is already settled`,
        );
      }

      const [created] = await tx
        .insert(payments)
        .values({
          ...tenantInsert(),
          order_id: orderId,
          amount: deptSubtotal,
          amount_cents: deptSubtotal,
          payment_method: method,
          method,
          status: "paid",
          processed_by: body.processed_by || null,
          paid_at: new Date(),
          meta: {
            scope: "department",
            department,
            item_count: deptLines.length,
          },
        })
        .returning();

      settled.add(department);

      const present = new Set<string>(lines.map(deptOf));
      const fullyPaid = Array.from(present).every((d) => settled.has(d));

      // The 3-value payment vocab has no "partially_paid": an order keeps
      // "pending" until every department is settled, then flips to "paid" and
      // the order closes (lifecycle -> done). Per-department progress lives on
      // the individual payment rows (meta.scope = "department").
      await tx
        .update(orders)
        .set({
          ...(fullyPaid ? { status: "done" } : {}),
          payment_status: fullyPaid ? "paid" : "pending",
          updated_at: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.branch_id, branchId)));

      if (fullyPaid) {
        await this.deductOrderStock(tx, orderId, body.processed_by);
      }

      return {
        payment: created,
        fully_paid: fullyPaid,
        settled_departments: Array.from(settled),
      };
    });

    if (result.payment) {
      await emitCreated(
        db,
        "payment",
        "PAYMENT_CREATED",
        result.payment as any,
      );
    }

    // Notify any POS watching this branch: the order's payment status changed
    // (now fully paid, or partially paid with this department settled).
    await this.pushOrderUpdate(orderId);

    return result;
  }

  async getPendingPayments() {
    const rows = await db
      .select({
        payment: payments,
        order: orders,
        user: users,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.order_id, orders.id))
      .leftJoin(users, eq(payments.processed_by, users.id))
      .where(
        and(
          eq(payments.status, "pending"),
          eq(payments.branch_id, requireBranchId()),
        ),
      )
      .orderBy(asc(payments.created_at));

    return rows.map((row: any) =>
      this.serializePayment(row.payment, row.order, row.user),
    );
  }

  private parseDateBound(value: string, end: boolean): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
    }
    return new Date(value);
  }

  /**
   * Paginated, date-windowed payment history for the dashboard. Returns the page
   * of rows plus the total count and summary stats computed server-side over the
   * whole window so the stat cards stay correct without loading every payment.
   */
  async getPaymentHistory(filters: any) {
    // Every interface presents payments on their order's created time, so the
    // date window, sorting and bucketing all key off the order — not when the
    // money was actually taken.
    const displayTime = sql`coalesce(${orders.created_at}, ${payments.created_at})`;

    // Pagination and the default 30-day window are opt-in: a caller that passes
    // neither page/limit nor an explicit date range gets the full history (which
    // the dashboard summary / reports pages still aggregate client-side).
    const paginate = filters.page != null || filters.limit != null;
    const hasExplicitDates =
      filters.date_from != null || filters.date_to != null;

    const conditions = [eq(payments.branch_id, requireBranchId())] as any[];

    let from: Date | null = null;
    let to: Date | null = null;
    if (hasExplicitDates || paginate) {
      to = filters.date_to
        ? this.parseDateBound(filters.date_to, true)
        : new Date();
      from = filters.date_from
        ? this.parseDateBound(filters.date_from, false)
        : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      conditions.push(gte(displayTime, from));
      conditions.push(lte(displayTime, to));
    }

    if (filters.status) conditions.push(eq(payments.status, filters.status));
    if (filters.payment_method)
      conditions.push(eq(payments.payment_method, filters.payment_method));
    if (filters.processed_by)
      conditions.push(eq(payments.processed_by, filters.processed_by));

    const search = String(filters.search ?? "")
      .trim()
      .toLowerCase();
    if (search) {
      const like = `%${search}%`;
      conditions.push(sql`(
        lower(coalesce(${payments.payment_method}, '')) like ${like}
        or lower(coalesce(${payments.status}, '')) like ${like}
        or cast(${payments.id} as text) like ${like}
      )`);
    }

    const where = and(...conditions);
    const isPaid = sql`lower(coalesce(${payments.status}, '')) = 'paid'`;

    const [agg] = await db
      .select({
        total: count(),
        collected: sql<number>`coalesce(sum(case when ${isPaid} then coalesce(${payments.amount}, 0) else 0 end), 0)`,
        paid_count: sql<number>`count(*) filter (where ${isPaid})`,
        pending: sql<number>`count(*) filter (where lower(coalesce(${payments.status}, '')) = 'pending')`,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.order_id, orders.id))
      .where(where);

    const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 100);
    const page = Math.max(Number(filters.page) || 1, 1);

    // Whitelist of columns the client may sort by; anything else falls back to
    // the default newest-first ordering.
    const SORTABLE: Record<string, any> = {
      amount: payments.amount,
      paid_at: displayTime,
      order_number: orders.order_number,
    };
    const sortCol = SORTABLE[filters.sort_by as string];
    const dir = filters.sort_dir === "asc" ? asc : desc;
    const orderBy = sortCol
      ? [dir(sortCol), desc(displayTime)]
      : [desc(displayTime)];

    const baseQuery = db
      .select({
        payment: payments,
        order: orders,
        user: users,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.order_id, orders.id))
      .leftJoin(users, eq(payments.processed_by, users.id))
      .where(where)
      .orderBy(...orderBy);

    const rows = paginate
      ? await baseQuery.limit(limit).offset((page - 1) * limit)
      : await baseQuery;

    const list = rows.map((row: any) =>
      this.serializePayment(row.payment, row.order, row.user),
    );

    const collected = Number(agg?.collected ?? 0);
    const paidCount = Number(agg?.paid_count ?? 0);

    return {
      payments: list,
      count: Number(agg?.total ?? 0),
      page: paginate ? page : 1,
      limit: paginate ? limit : Number(agg?.total ?? 0),
      window:
        from && to ? { from: from.toISOString(), to: to.toISOString() } : null,
      stats: {
        total_payments: Number(agg?.total ?? 0),
        collected,
        paid_count: paidCount,
        pending: Number(agg?.pending ?? 0),
        avg: paidCount > 0 ? collected / paidCount : 0,
      },
    };
  }

  private formatEmployeeName(employee: any) {
    if (!employee) return null;
    return [employee.first_name, employee.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  /**
   * Shape a payment for any client-facing list/detail. Every interface shows a
   * payment against its *order's* created time, not when the money was actually
   * taken: the displayed `paid_at`/`created_at` are overwritten with the order's
   * created_at so dates, sorting and date-bucketing line up with the order. The
   * true confirmation/insert times are preserved (audit) under `actual_paid_at`
   * and `payment_created_at`.
   */
  private serializePayment(payment: any, order: any, user?: any) {
    const displayTime = order?.created_at ?? payment.created_at;
    return {
      ...payment,
      paid_at: displayTime,
      created_at: displayTime,
      display_time: displayTime,
      actual_paid_at: payment.paid_at,
      payment_created_at: payment.created_at,
      customer_id: order?.customer_id,
      order_number: order?.order_number,
      order_type: order?.type,
      table_number: order?.table_number,
      processed_by_name: this.formatEmployeeName(user),
    };
  }
}
