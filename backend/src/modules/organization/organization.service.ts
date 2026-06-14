import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { organizations } from "../../db/tables/organizations.table";
import { orders } from "../../db/tables/orders.table";
import { order_items } from "../../db/tables/order-items.table";
import { org_credit_payments } from "../../db/tables/org-credit-payments.table";
import { org_credit_transactions } from "../../db/tables/org-credit-transactions.table";
import { requireBranchId, tenantInsert } from "../../common/tenant/tenant-context";
import { emitCreated, emitUpdated } from "../sync/sync-emit.util";

@Injectable()
export class OrganizationService {
  private payload(row: typeof organizations.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      contact_name: row.contact_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      is_active: row.is_active,
      credit_balance: row.credit_balance,
      meta: row.meta,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    };
  }

  async findAll(includeInactive = false) {
    const branchCondition = eq(organizations.branch_id, requireBranchId());
    const base = db.select().from(organizations);
    const rows = includeInactive
      ? await base.where(branchCondition).orderBy(asc(organizations.name))
      : await base
          .where(and(branchCondition, eq(organizations.is_active, true)))
          .orderBy(asc(organizations.name));
    return rows;
  }

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, id), eq(organizations.branch_id, requireBranchId())))
      .limit(1);
    if (!row) throw new NotFoundException("Organization not found");
    return row;
  }

  async create(input: any) {
    const name = String(input?.name || "").trim();
    if (!name) throw new BadRequestException("Organization name is required");

    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(organizations)
        .values({
          ...tenantInsert(),
          name,
          contact_name: input?.contact_name?.trim() || null,
          phone: input?.phone?.trim() || null,
          email: input?.email?.trim() || null,
          address: input?.address?.trim() || null,
          notes: input?.notes?.trim() || null,
          is_active: input?.is_active !== false,
          meta: {},
        })
        .returning();

      await emitCreated(
        tx as any,
        "organization",
        "ORGANIZATION_CREATED",
        this.payload(created),
      );

      return created;
    });
  }

  async update(id: string, input: any) {
    const current = await this.findById(id);
    const updates: Record<string, any> = {
      updated_at: new Date(),
      version: (current.version ?? 1) + 1,
    };

    if (input?.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) throw new BadRequestException("Organization name is required");
      updates.name = name;
    }
    if (input?.contact_name !== undefined)
      updates.contact_name = input.contact_name?.trim() || null;
    if (input?.phone !== undefined)
      updates.phone = input.phone?.trim() || null;
    if (input?.email !== undefined)
      updates.email = input.email?.trim() || null;
    if (input?.address !== undefined)
      updates.address = input.address?.trim() || null;
    if (input?.notes !== undefined)
      updates.notes = input.notes?.trim() || null;
    if (input?.is_active !== undefined)
      updates.is_active = input.is_active !== false;

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(organizations)
        .set(updates)
        .where(and(eq(organizations.id, id), eq(organizations.branch_id, requireBranchId())))
        .returning();
      if (!updated) throw new NotFoundException("Organization not found");

      await emitUpdated(
        tx as any,
        "organization",
        "ORGANIZATION_UPDATED",
        this.payload(updated),
      );

      return updated;
    });
  }

  /** Soft-delete: keeps historical orders linked to the organization. */
  async deactivate(id: string) {
    const current = await this.findById(id);

    const [updated] = await db
      .update(organizations)
      .set({
        is_active: false,
        deleted_at: new Date(),
        updated_at: new Date(),
        version: (current.version ?? 1) + 1,
      })
      .where(and(eq(organizations.id, id), eq(organizations.branch_id, requireBranchId())))
      .returning();

    if (updated) {
      await emitUpdated(
        db as any,
        "organization",
        "ORGANIZATION_DEACTIVATED",
        this.payload(updated),
      );
    }

    return updated;
  }

  async getOrders(id: string) {
    await this.findById(id);
    const rows = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.organization_id, id),
          eq(orders.branch_id, requireBranchId()),
        ),
      )
      .orderBy(desc(orders.created_at));

    const withItems = await Promise.all(
      rows.map(async (order) => {
        const items = await db
          .select()
          .from(order_items)
          .where(eq(order_items.order_id, order.id));
        return { ...order, items };
      }),
    );

    return withItems;
  }

  // ─── Credit System ─────────────────────────────────────────────────────────

  /** Add a credit payment (top-up) and increment the org's balance. */
  async addPayment(orgId: string, input: any) {
    await this.findById(orgId);

    const amount = Number(input?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Payment amount must be a positive number");
    }

    return db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(org_credit_payments)
        .values({
          ...tenantInsert(),
          organization_id: orgId,
          amount: String(amount),
          payment_date: input?.payment_date ? new Date(input.payment_date) : new Date(),
          notes: input?.notes?.trim() || null,
        })
        .returning();

      // Increment the credit balance
      await tx
        .update(organizations)
        .set({
          credit_balance: sql`${organizations.credit_balance} + ${String(amount)}`,
          updated_at: new Date(),
        })
        .where(eq(organizations.id, orgId));

      // Automatically link unlinked transactions to this payment until payment is exhausted
      const unlinkedTxns = await tx
        .select()
        .from(org_credit_transactions)
        .where(
          and(
            eq(org_credit_transactions.organization_id, orgId),
            isNull(org_credit_transactions.payment_id)
          )
        )
        .orderBy(asc(org_credit_transactions.transaction_date));

      let remainingAmount = amount;
      for (const txn of unlinkedTxns) {
        if (remainingAmount <= 0) break;
        
        const txnAmount = Number(txn.total_amount);
        if (txnAmount <= remainingAmount) {
          // Link this transaction to the payment
          await tx
            .update(org_credit_transactions)
            .set({ payment_id: payment.id })
            .where(eq(org_credit_transactions.id, txn.id));
          
          remainingAmount -= txnAmount;
        }
      }

      return payment;
    });
  }

  /** List all credit payments for an organization. */
  async getPayments(orgId: string) {
    await this.findById(orgId);
    return db
      .select()
      .from(org_credit_payments)
      .where(eq(org_credit_payments.organization_id, orgId))
      .orderBy(desc(org_credit_payments.payment_date));
  }

  /**
   * Add a transaction (service deduction) and decrement the org's balance.
   * Does NOT block on insufficient credit — admins can go negative.
   * Automatically attaches to a payment with positive balance if no payment_id is provided.
   */
  async addTransaction(orgId: string, input: any) {
    await this.findById(orgId);

    const services: Array<{ description: string; cost: number }> =
      Array.isArray(input?.services) ? input.services : [];

    if (services.length === 0) {
      throw new BadRequestException("At least one service is required");
    }

    const total = services.reduce((sum, s) => sum + Number(s.cost || 0), 0);
    if (!Number.isFinite(total) || total < 0) {
      throw new BadRequestException("Invalid service costs");
    }

    return db.transaction(async (tx) => {
      // If no payment_id provided, automatically find a payment with positive balance
      let paymentId = input?.payment_id ? String(input.payment_id) : null;
      
      if (!paymentId) {
        // Find payments with positive remaining balance (oldest first)
        const allPayments = await tx
          .select()
          .from(org_credit_payments)
          .where(eq(org_credit_payments.organization_id, orgId))
          .orderBy(asc(org_credit_payments.payment_date));
        
        // Get all transactions to calculate remaining balance for each payment
        const allTransactions = await tx
          .select()
          .from(org_credit_transactions)
          .where(eq(org_credit_transactions.organization_id, orgId));
        
        // Calculate remaining balance for each payment (oldest first)
        for (const payment of allPayments) {
          const linkedTxns = allTransactions.filter(t => t.payment_id === payment.id);
          const deducted = linkedTxns.reduce((sum: number, t: any) => sum + Number(t.total_amount), 0);
          const remaining = Number(payment.amount) - deducted;
          
          if (remaining > 0) {
            paymentId = payment.id;
            break;
          }
        }
      }

      const [transaction] = await tx
        .insert(org_credit_transactions)
        .values({
          ...tenantInsert(),
          organization_id: orgId,
          payment_id: paymentId,
          transaction_date: input?.transaction_date
            ? new Date(input.transaction_date)
            : new Date(),
          notes: input?.notes?.trim() || null,
          services: services,
          total_amount: String(total),
        })
        .returning();

      // Decrement the credit balance
      await tx
        .update(organizations)
        .set({
          credit_balance: sql`${organizations.credit_balance} - ${String(total)}`,
          updated_at: new Date(),
        })
        .where(eq(organizations.id, orgId));

      return transaction;
    });
  }

  /** List all credit transactions for an organization with pagination. */
  async getTransactions(orgId: string, page: number = 1, limit: number = 20) {
    await this.findById(orgId);
    
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(org_credit_transactions)
      .where(eq(org_credit_transactions.organization_id, orgId));
    
    // Get paginated transactions
    const offset = (page - 1) * limit;
    const transactions = await db
      .select()
      .from(org_credit_transactions)
      .where(eq(org_credit_transactions.organization_id, orgId))
      .orderBy(desc(org_credit_transactions.transaction_date))
      .limit(limit)
      .offset(offset);
    
    return {
      transactions,
      count: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  /** Return org with credit balance + summary data. */
  async getCreditSummary(orgId: string) {
    const org = await this.findById(orgId);
    const payments = await this.getPayments(orgId);
    const transactionsResult = await this.getTransactions(orgId, 1, 1000);
    const transactions = transactionsResult.transactions;

    const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalDeducted = transactions.reduce(
      (s: number, t: any) => s + Number(t.total_amount),
      0,
    );

    return {
      organization: org,
      credit_balance: Number(org.credit_balance ?? 0),
      total_paid: totalPaid,
      total_deducted: totalDeducted,
      payments,
      transactions,
    };
  }
}
