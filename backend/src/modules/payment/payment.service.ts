import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { order_items } from "../../db/tables/order-items.table";
import { orders } from "../../db/tables/orders.table";
import { payments } from "../../db/tables/payments.table";
import { stockMovements } from "../../db/tables/stock-movements.table";
import { systemSettings } from "../../db/tables/system-settings.table";
import { users } from "../../db/tables/users.table";
import { OrderInventoryService } from "../order/order-inventory.service";
import { emitCreated, emitUpdated } from "../sync/sync-emit.util";
import { tenantInsert } from "../../common/tenant/tenant-context";
const QRCode: any = require("qrcode");

@Injectable()
export class PaymentService {
  constructor(private readonly orderInventoryService: OrderInventoryService) {}

  async create(paymentData: any) {
    const { order_id, amount, payment_method, processed_by, description } =
      paymentData;

    const [created] = await db
      .insert(payments)
      .values({
        ...tenantInsert(),
        order_id: order_id || null,
        amount,
        amount_cents: amount,
        payment_method,
        method: payment_method,
        status: "pending",
        processed_by,
        description: description || null,
      })
      .returning();

    if (created) {
      await emitCreated(db, "payment", "PAYMENT_CREATED", created as any);
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
      .where(eq(payments.id, id))
      .limit(1);

    if (!row) return undefined;

    return {
      ...row.payment,
      customer_id: row.order?.customer_id,
      order_type: row.order?.type,
      processed_by_name: this.formatEmployeeName(row.user),
    };
  }

  async findByOrderId(orderId: string) {
    const rows = await db
      .select({
        payment: payments,
        user: users,
      })
      .from(payments)
      .leftJoin(users, eq(payments.processed_by, users.id))
      .where(eq(payments.order_id, orderId))
      .orderBy(desc(payments.created_at));

    return rows.map((row: any) => ({
      ...row.payment,
      processed_by_name: this.formatEmployeeName(row.user),
    }));
  }

  async generateQRCode(id: string) {
    const payment = await this.findById(id);
    if (!payment) {
      throw new Error("Payment not found");
    }

    const qrData = {
      payment_id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      customer_id: payment.customer_id,
      timestamp: new Date().toISOString(),
    };

    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    const [updated] = await db
      .update(payments)
      .set({ qr_code: qrCodeDataURL, updated_at: new Date() })
      .where(eq(payments.id, id))
      .returning();

    return updated;
  }

  async updateStatus(id: string, status: string, processedBy?: any) {
    const [updated] = await db
      .update(payments)
      .set({ status, processed_by: processedBy, updated_at: new Date() })
      .where(eq(payments.id, id))
      .returning();
    if (updated) {
      await emitUpdated(db, "payment", "PAYMENT_UPDATED", updated as any);
    }
    return updated;
  }

  async confirmPayment(id: string, processedBy?: any) {
    const [settingRow] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, "allow_low_stock_orders"))
      .limit(1);
    const allowLowStock = settingRow?.value === "true";

    return db.transaction(async (tx: any) => {
      const [payment] = await tx
        .update(payments)
        .set({
          status: "paid",
          processed_by: processedBy,
          paid_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(payments.id, id))
        .returning();

      if (!payment) {
        throw new Error("Payment not found");
      }

      const [existingSaleMovement] = await tx
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.order_id, payment.order_id),
            eq(stockMovements.movement_type, "sale"),
          ),
        )
        .limit(1);

      await tx
        .update(orders)
        .set({
          status: "paid",
          payment_status: "paid",
          updated_at: new Date(),
        })
        .where(eq(orders.id, payment.order_id));

      const orderLines = await tx
        .select({
          id: order_items.id,
          menu_item_id: order_items.menu_item_id,
          quantity: order_items.quantity,
          main_category: order_items.main_category,
          item_type: order_items.item_type,
        })
        .from(order_items)
        .where(eq(order_items.order_id, payment.order_id));

      if (existingSaleMovement) {
        return payment;
      }

      await this.orderInventoryService.reconcileOrderItems({
        tx,
        orderId: payment.order_id,
        previousItems: [],
        nextItems: orderLines,
        createdBy: processedBy || null,
        allowLowStock,
      });

      return payment;
    });
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
      .where(eq(payments.status, "pending"))
      .orderBy(asc(payments.created_at));

    return rows.map((row: any) => ({
      ...row.payment,
      customer_id: row.order.customer_id,
      order_type: row.order.type,
      table_number: row.order.table_number,
      processed_by_name: this.formatEmployeeName(row.user),
    }));
  }

  async getPaymentHistory(filters: any) {
    const conditions = [] as any[];
    if (filters.status) conditions.push(eq(payments.status, filters.status));
    if (filters.payment_method)
      conditions.push(eq(payments.payment_method, filters.payment_method));
    if (filters.processed_by)
      conditions.push(eq(payments.processed_by, filters.processed_by));
    if (filters.date_from)
      conditions.push(gte(payments.created_at, new Date(filters.date_from)));
    if (filters.date_to)
      conditions.push(lte(payments.created_at, new Date(filters.date_to)));

    const rows = await db
      .select({
        payment: payments,
        order: orders,
        user: users,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.order_id, orders.id))
      .leftJoin(users, eq(payments.processed_by, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.created_at));

    return rows.map((row: any) => ({
      ...row.payment,
      customer_id: row.order.customer_id,
      order_type: row.order.type,
      table_number: row.order.table_number,
      processed_by_name: this.formatEmployeeName(row.user),
    }));
  }

  async createWithQR(body: any) {
    const payment = await this.create(body);
    return this.generateQRCode(payment.id);
  }

  async getByQR(qrData: any) {
    const parsed = qrData;
    return this.findById(parsed.payment_id);
  }

  private formatEmployeeName(employee: any) {
    if (!employee) return null;
    return [employee.first_name, employee.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }
}
