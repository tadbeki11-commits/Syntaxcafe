import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { expenses } from "../../db/schema";
import {
  getTenant,
  requireBranchId,
  tenantInsert,
} from "../../common/tenant/tenant-context";

// Fixed category set. Keep in sync with the web Expenses page dropdown.
export const EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "salaries",
  "supplies",
  "maintenance",
  "other",
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ExpensesService {
  private normalizeCategory(value: any): string {
    const c = String(value || "").trim().toLowerCase();
    if (!EXPENSE_CATEGORIES.includes(c as any)) {
      throw new BadRequestException(
        `Invalid category. Expected one of: ${EXPENSE_CATEGORIES.join(", ")}`,
      );
    }
    return c;
  }

  private normalizeAmount(value: any): number {
    const amount = Math.round(Number(value));
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException("Amount must be a non-negative number");
    }
    return amount;
  }

  private parseDate(value: any): Date | null {
    if (value === undefined || value === null || value === "") return null;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
      throw new BadRequestException("Invalid date");
    }
    return dt;
  }

  async findAll(opts: { from?: string; to?: string; category?: string } = {}) {
    const filters = [
      eq(expenses.branch_id, requireBranchId()),
      isNull(expenses.deleted_at),
    ];

    const from = this.parseDate(opts.from);
    if (from) filters.push(gte(expenses.expense_date, from));
    const to = this.parseDate(opts.to);
    if (to) filters.push(lte(expenses.expense_date, to));
    if (opts.category) {
      filters.push(eq(expenses.category, this.normalizeCategory(opts.category)));
    }

    return db
      .select()
      .from(expenses)
      .where(and(...filters))
      .orderBy(desc(expenses.expense_date), desc(expenses.created_at));
  }

  async findById(id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundException("Expense not found");
    const [row] = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.branch_id, requireBranchId()),
          isNull(expenses.deleted_at),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Expense not found");
    return row;
  }

  async create(payload: any) {
    const category = this.normalizeCategory(payload?.category);
    const amount = this.normalizeAmount(payload?.amount);
    const tenant = getTenant();

    const fields = {
      category,
      description: payload?.description?.trim() || null,
      amount,
      amount_cents: Number(payload?.amount_cents ?? 0) || 0,
      payment_method: payload?.payment_method?.trim() || null,
      expense_date: this.parseDate(payload?.expense_date) ?? new Date(),
    };

    // Offline clients send their own UUID so sync retries are idempotent: the
    // same local id maps to the same backend row. If it already exists, treat
    // the push as an edit (this also propagates edits made offline).
    const clientId =
      typeof payload?.id === "string" && UUID_RE.test(payload.id)
        ? payload.id
        : null;

    if (clientId) {
      const [existing] = await db
        .select()
        .from(expenses)
        .where(
          and(eq(expenses.id, clientId), eq(expenses.branch_id, requireBranchId())),
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(expenses)
          .set({
            ...fields,
            deleted_at: null,
            updated_at: new Date(),
            version: (existing.version ?? 1) + 1,
          })
          .where(eq(expenses.id, clientId))
          .returning();
        return updated;
      }
    }

    const [created] = await db
      .insert(expenses)
      .values({
        ...(clientId ? { id: clientId } : {}),
        ...tenantInsert(),
        ...fields,
        recorded_by: tenant?.userId ?? null,
        recorded_by_name: tenant?.username ?? null,
      })
      .returning();

    return created;
  }

  async update(id: string, payload: any) {
    const current = await this.findById(id);
    const updates: Record<string, any> = {
      updated_at: new Date(),
      version: (current.version ?? 1) + 1,
    };

    if (payload?.category !== undefined) {
      updates.category = this.normalizeCategory(payload.category);
    }
    if (payload?.description !== undefined) {
      updates.description = payload.description?.trim() || null;
    }
    if (payload?.amount !== undefined) {
      updates.amount = this.normalizeAmount(payload.amount);
    }
    if (payload?.amount_cents !== undefined) {
      updates.amount_cents = Number(payload.amount_cents) || 0;
    }
    if (payload?.payment_method !== undefined) {
      updates.payment_method = payload.payment_method?.trim() || null;
    }
    if (payload?.expense_date !== undefined) {
      const dt = this.parseDate(payload.expense_date);
      if (dt) updates.expense_date = dt;
    }

    const [updated] = await db
      .update(expenses)
      .set(updates)
      .where(
        and(eq(expenses.id, id), eq(expenses.branch_id, requireBranchId())),
      )
      .returning();

    if (!updated) throw new NotFoundException("Expense not found");
    return updated;
  }

  async remove(id: string) {
    await this.findById(id);
    const [deleted] = await db
      .update(expenses)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(
        and(eq(expenses.id, id), eq(expenses.branch_id, requireBranchId())),
      )
      .returning();
    return deleted;
  }

  // Total expenses for the branch within an optional date range, plus a
  // per-category breakdown. Profit (revenue − expenses) is composed on the
  // client from this total and paid order revenue.
  async summary(opts: { from?: string; to?: string } = {}) {
    const filters = [
      eq(expenses.branch_id, requireBranchId()),
      isNull(expenses.deleted_at),
    ];
    const from = this.parseDate(opts.from);
    if (from) filters.push(gte(expenses.expense_date, from));
    const to = this.parseDate(opts.to);
    if (to) filters.push(lte(expenses.expense_date, to));

    const rows = await db
      .select({
        category: expenses.category,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(and(...filters))
      .groupBy(expenses.category);

    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const amt = Number(r.total) || 0;
      byCategory[r.category] = amt;
      total += amt;
    }
    return { total, byCategory };
  }
}
