// @ts-nocheck
import { generateLocalId, localDbTables } from "@/db/localDb";
import {
  deleteById,
  findById,
  readRows,
  upsertRow,
} from "@/infrastructure/database/local-db-query";
import { getApproximateServerIsoString } from "@/shared/utils/serverTime";

const ok = (data: any) => ({
  data: { status: "success", data },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as any,
});

/**
 * Normalize a stored row into the shape the UI expects. Both the cashier batch
 * model (`items` + `total`) and the admin single-record model (`title`,
 * `amount`, `category`, ...) live in the same table; line items ride in
 * `raw_json` and are merged back by `readRows`.
 */
const toExpense = (row: any) => {
  const items = Array.isArray(row?.items) ? row.items : [];
  const total = Number(row?.total ?? row?.amount ?? 0) || 0;
  return {
    ...row,
    items,
    total,
    amount: Number(row?.amount ?? total) || 0,
    created_at: row?.created_at ?? null,
  };
};

const sortByCreatedDesc = (a: any, b: any) => {
  const at = new Date(a?.created_at || 0).getTime();
  const bt = new Date(b?.created_at || 0).getTime();
  return bt - at;
};

export const expensesAdapter = {
  /** List saved expenses (newest first). Filtering is handled in the UI. */
  getAll: async (..._args: any[]) => {
    const rows = await readRows(localDbTables.expenses);
    const expenses = rows.map(toExpense).sort(sortByCreatedDesc);
    return ok({ expenses, count: expenses.length });
  },

  /** Categories / payment methods come from the UI defaults when empty. */
  getMeta: async (..._args: any[]) => ok({ categories: [], payment_methods: [] }),

  getDashboard: async (..._args: any[]) =>
    ok({ cards: null, recent_expenses: [], trends: { daily: [], monthly: [] } }),

  getReports: async (..._args: any[]) =>
    ok({ totals: null, category_totals: [], top_expenses: [], expense_vs_sales: null }),

  /**
   * Create an expense. Accepts either:
   *  - `{ items: [{ item, cost }] }`  (cashier batch entry)
   *  - `{ title, amount, category, ... }` (admin single record)
   */
  create: async (input: any = {}) => {
    const expenseId = generateLocalId();
    const created_at = getApproximateServerIsoString();

    let items: { item: string; cost: number }[] = [];
    let total = 0;

    if (Array.isArray(input?.items)) {
      items = input.items.map((it: any) => ({
        item: String(it?.item ?? "").trim(),
        cost: Number(it?.cost) || 0,
      }));
      total = items.reduce((sum, it) => sum + (Number.isFinite(it.cost) ? it.cost : 0), 0);
    } else {
      total = Number(input?.amount ?? input?.total ?? 0) || 0;
    }

    const row = {
      ...input,
      id: expenseId,
      items,
      total,
      amount: Number(input?.amount ?? total) || 0,
      synced: 0,
      created_at,
      updated_at: created_at,
    };

    const id = await upsertRow(localDbTables.expenses, row);
    return ok({ expense: toExpense({ id, ...row }) });
  },

  update: async (id: number | string, input: any = {}) => {
    // Local ids are UUID strings (see generateLocalId) — never coerce to Number,
    // or findById matches nothing and the edit silently no-ops.
    const expenseId = String(id);
    const existing = await findById(localDbTables.expenses, expenseId);
    if (!existing?.id) return ok({ expense: null });

    const merged = { ...existing, ...input };
    // Regenerated from the row on write — drop the stale copy so it isn't nested.
    delete merged.raw_json;

    if (Array.isArray(input?.items)) {
      merged.items = input.items.map((it: any) => ({
        item: String(it?.item ?? "").trim(),
        cost: Number(it?.cost) || 0,
      }));
    }

    const items = Array.isArray(merged.items) ? merged.items : [];
    if (items.length) {
      // Line items drive the totals for batch (cashier) entries.
      merged.total = items.reduce((sum: number, it: any) => sum + (Number(it?.cost) || 0), 0);
      merged.amount = merged.total;
    } else {
      merged.total = Number(merged?.amount ?? merged?.total ?? 0) || 0;
      merged.amount = Number(merged?.amount ?? merged.total) || 0;
    }
    merged.synced = 0;
    merged.updated_at = getApproximateServerIsoString();

    await upsertRow(localDbTables.expenses, merged);
    return ok({ expense: toExpense(merged) });
  },

  delete: async (id: number | string) => {
    // Match update(): ids are UUID strings, so pass through as-is.
    await deleteById(localDbTables.expenses, String(id));
    return ok({ success: true });
  },
};

export default expensesAdapter;
