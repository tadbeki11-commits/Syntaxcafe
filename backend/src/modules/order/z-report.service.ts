import { Injectable } from "@nestjs/common";
import { and, between, count, eq, gte, inArray, lte, sql, sum } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { orders } from "../../db/tables/orders.table";
import { payments } from "../../db/tables/payments.table";
import { order_items } from "../../db/tables/order-items.table";
import { users } from "../../db/tables/users.table";
import { menuItems } from "../../db/tables/menu-items.table";
import { requireBranchId } from "../../common/tenant/tenant-context";

export interface ZReportData {
  report_date: string;
  period_start: string;
  period_end: string;
  summary: {
    total_orders: number;
    total_sales_cents: number;
    total_sales: number;
    gross_sales_cents: number;
    gross_sales: number;
    refunds_cents: number;
    refunds: number;
    discounts_cents: number;
    discounts: number;
    net_sales_cents: number;
    net_sales: number;
  };
  payment_breakdown: Array<{
    method: string;
    amount_cents: number;
    amount: number;
    count: number;
    percentage: number;
  }>;
  employee_activity: Array<{
    employee_id: number;
    employee_name: string;
    orders_count: number;
    total_sales_cents: number;
    total_sales: number;
  }>;
  voided_transactions: Array<{
    order_id: number;
    employee_id: number;
    employee_name: string;
    amount_cents: number;
    amount: number;
    created_at: string;
  }>;
  category_breakdown: Array<{
    category: string;
    amount_cents: number;
    amount: number;
    count: number;
  }>;
}

@Injectable()
export class ZReportService {
  async generateZReport(startDate: Date, endDate: Date): Promise<ZReportData> {
    const periodStart = startDate.toISOString();
    const periodEnd = endDate.toISOString();
    const branchId = requireBranchId();

    // Get all orders in the period (scoped to the current branch)
    const allOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.branch_id, branchId),
          gte(orders.created_at, startDate),
          lte(orders.created_at, endDate)
        )
      );

    // Separate completed/paid orders from voided/cancelled
    const completedOrders = allOrders.filter(
      (o) => o.status === "completed" || o.payment_status === "paid"
    );
    const voidedOrders = allOrders.filter(
      (o) => o.status === "cancelled" || o.status === "voided"
    );

    // Calculate summary
    const totalOrders = completedOrders.length;
    const totalSalesCents = completedOrders.reduce(
      (sum, o) => sum + ((o.total_cents ?? 0) > 0 ? (o.total_cents ?? 0) : (o.total_amount ?? 0) * 100),
      0
    );
    const grossSalesCents = totalSalesCents; // Assuming no tax calculation yet
    const refundsCents = voidedOrders.reduce(
      (sum, o) => sum + ((o.total_cents ?? 0) > 0 ? (o.total_cents ?? 0) : (o.total_amount ?? 0) * 100),
      0
    );
    const discountsCents = 0; // No discount field in current schema
    const netSalesCents = grossSalesCents - refundsCents - discountsCents;

    // Get payment breakdown
    const completedOrderIds = completedOrders.map((o) => o.id);
    const paymentData = await db
      .select({
        method: payments.payment_method,
        amount: sql<number>`COALESCE(SUM(${payments.amount_cents}), 0)`,
        count: count(),
      })
      .from(payments)
      .where(
        and(
          eq(payments.branch_id, branchId),
          eq(payments.status, "completed"),
          completedOrderIds.length > 0
            ? sql`${payments.order_id} IN ${completedOrderIds}`
            : sql`1=0`
        )
      )
      .groupBy(payments.payment_method);

    const paymentBreakdown = paymentData.map((p) => ({
      method: p.method || "unknown",
      amount_cents: Number(p.amount),
      amount: Number(p.amount) / 100,
      count: Number(p.count),
      percentage: totalSalesCents > 0 
        ? (Number(p.amount) / totalSalesCents) * 100 
        : 0,
    }));

    // Get employee activity
    const employeeData = await db
      .select({
        employee_id: orders.employee_id,
        employee_name: sql<string>`COALESCE(${users.username}, 'Unknown')`,
        orders_count: count(),
        total_sales: sql<number>`COALESCE(SUM(CASE WHEN ${orders.total_cents} > 0 THEN ${orders.total_cents} ELSE ${orders.total_amount} * 100 END), 0)`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(
        and(
          eq(orders.branch_id, branchId),
          gte(orders.created_at, startDate),
          lte(orders.created_at, endDate),
          sql`${orders.status} IN ('completed', 'paid')`
        )
      )
      .groupBy(orders.employee_id, users.username);

    const employeeActivity = employeeData.map((e) => ({
      employee_id: Number(e.employee_id) || 0,
      employee_name: e.employee_name,
      orders_count: Number(e.orders_count),
      total_sales_cents: Number(e.total_sales),
      total_sales: Number(e.total_sales) / 100,
    }));

    // Get voided transactions with employee info
    const voidedTransactions = await db
      .select({
        order_id: orders.id,
        employee_id: orders.employee_id,
        employee_name: sql<string>`COALESCE(${users.username}, 'Unknown')`,
        amount_cents: orders.total_cents,
        amount: orders.total_amount,
        created_at: orders.created_at,
      })
      .from(orders)
      .leftJoin(users, eq(orders.employee_id, users.id))
      .where(
        and(
          eq(orders.branch_id, branchId),
          gte(orders.created_at, startDate),
          lte(orders.created_at, endDate),
          sql`${orders.status} IN ('cancelled', 'voided')`
        )
      );

    const voidedTxns = voidedTransactions.map((v) => {
      const cents = (v.amount_cents ?? 0) > 0 ? (v.amount_cents ?? 0) : (v.amount ?? 0) * 100;
      return {
        order_id: Number(v.order_id),
        employee_id: Number(v.employee_id) || 0,
        employee_name: v.employee_name,
        amount_cents: cents,
        amount: cents / 100,
        created_at: v.created_at?.toISOString() || "",
      };
    });

    // Get category breakdown
    let categoryData: Array<{
      category: string | null;
      amount: number;
      count: number;
    }>;
   
    if (completedOrderIds.length > 0) {
      categoryData = await db
        .select({
          category: sql<string>`COALESCE(${order_items.main_category}, ${menuItems.main_category}, ${menuItems.category})`,
          amount: sql<number>`COALESCE(SUM(${order_items.subtotal} * 100), 0)`,
          count: count(),
        })
        .from(order_items)
        .leftJoin(menuItems, eq(order_items.menu_item_id, menuItems.id))
        .where(inArray(order_items.order_id, completedOrderIds))
        .groupBy(sql`COALESCE(${order_items.main_category}, ${menuItems.main_category}, ${menuItems.category})`);
      
    } else {
      categoryData = [];
    }

    const categoryBreakdown = categoryData.map((c) => ({
      category: c.category || "uncategorized",
      amount_cents: Number(c.amount),
      amount: Number(c.amount) / 100,
      count: Number(c.count),
    }));

    return {
      report_date: new Date().toISOString(),
      period_start: periodStart,
      period_end: periodEnd,
      summary: {
        total_orders: totalOrders,
        total_sales_cents: totalSalesCents,
        total_sales: totalSalesCents / 100,
        gross_sales_cents: grossSalesCents,
        gross_sales: grossSalesCents / 100,
        refunds_cents: refundsCents,
        refunds: refundsCents / 100,
        discounts_cents: discountsCents,
        discounts: discountsCents / 100,
        net_sales_cents: netSalesCents,
        net_sales: netSalesCents / 100,
      },
      payment_breakdown: paymentBreakdown,
      employee_activity: employeeActivity,
      voided_transactions: voidedTxns,
      category_breakdown: categoryBreakdown,
    };
  }

  async generateTodayZReport(): Promise<ZReportData> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    return this.generateZReport(startOfDay, endOfDay);
  }
}
