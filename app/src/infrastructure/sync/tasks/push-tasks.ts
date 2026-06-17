import { localDbTables, generateLocalId } from "@/db/localDb";
import {
  ordersAdapter,
  extractPersistedOrderIds,
} from "@/infrastructure/adapters/orders.adapter";
import { api as apiClient } from "@/infrastructure/api/http-client";
import { readRows, upsertRow } from "@/infrastructure/database/local-db-query";
import type { SyncTask } from "./types";

const BATCH_SIZE = 50;

const isUnsynced = (row: any) => Number(row?.synced ?? 0) === 0;

// The backend expenses table stores a single record (no line items) and is keyed
// by a UUID. Local ids are UUIDs (generateLocalId); the rare non-UUID fallback id
// can't be mapped to the backend column, so those rows are skipped.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const syncableExpenseId = (row: any) => UUID_RE.test(String(row?.id ?? ""));

// Backend categories are a fixed set; map the app's free-text/admin categories
// onto the nearest one. Cashier batch entries have no category → "supplies".
const BACKEND_EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "salaries",
  "supplies",
  "maintenance",
  "other",
];

const mapExpenseCategory = (raw: any): string => {
  const c = String(raw ?? "").trim().toLowerCase();
  if (!c) return "other";
  if (BACKEND_EXPENSE_CATEGORIES.includes(c)) return c;
  if (c.includes("rent")) return "rent";
  if (c.includes("util")) return "utilities";
  if (c.includes("salar") || c.includes("payroll") || c.includes("wage"))
    return "salaries";
  if (c.includes("maint")) return "maintenance";
  if (
    c.includes("supply") ||
    c.includes("supplies") ||
    c.includes("ingredient") ||
    c.includes("food") ||
    c.includes("beverage") ||
    c.includes("clean") ||
    c.includes("equipment")
  )
    return "supplies";
  return "other";
};

const normalizeExpenseForBackend = (row: any) => {
  const items = Array.isArray(row?.items) ? row.items : [];
  const total = Number(row?.total ?? row?.amount ?? 0) || 0;

  // Batch (cashier) entries: serialize the line items into the description so
  // the web admin can show what was purchased, and bucket them under "supplies".
  let description: string | undefined;
  let category: string;
  if (items.length) {
    description = items
      .map((it: any) => `${String(it?.item ?? "").trim()} (${Number(it?.cost) || 0})`)
      .filter((s: string) => s && !s.startsWith(" ("))
      .join(", ");
    category = row?.category ? mapExpenseCategory(row.category) : "supplies";
  } else {
    const paidTo = row?.paid_to ? `Paid to: ${row.paid_to}` : "";
    description =
      [row?.title, paidTo, row?.notes].filter(Boolean).join(" — ") || undefined;
    category = mapExpenseCategory(row?.category);
  }

  const whole = Math.floor(total);
  return {
    id: String(row.id),
    category,
    amount: whole,
    amount_cents: Math.max(0, Math.round((total - whole) * 100)),
    payment_method: row?.payment_method ? String(row.payment_method) : undefined,
    description: description || undefined,
    expense_date: row?.created_at || undefined,
  };
};

const normalizeOrderPayload = (order: any) => ({
  id: order.id,
  employee_id: order.employee_id,
  waiter_id: order.waiter_id || undefined,
  customer_id: order.customer_id,
  table_number: order.table_number || undefined,
  order_type_label: order.order_type_label || undefined,
  type: order.type || "cafe",
  status: order.status,
  payment_status: order.payment_status,
  created_at: order.created_at,
  is_printed: order.is_printed,
  notes: order.notes || undefined,
  organization_id: order.organization_id ?? undefined,
  is_price_override: Boolean(order.is_price_override),
  items:
    order.items?.map((item: any) => ({
      id: item.id || generateLocalId(),
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      item_type: item.item_type || "food",
    })) || [],
  total_amount: order.total_amount,
});

const normalizePaymentPayload = (payment: any) => {
  return {
    id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount,
    payment_method: payment.payment_method,
    status: payment.status,
    processed_by: payment.processed_by || undefined,
    paid_at: payment.paid_at,
    description: payment.description || undefined,
  };
};

const markPaymentsAsSynced = async (payments: any[]) => {
  for (const payment of payments) {
    await upsertRow(localDbTables.payments, {
      ...payment,
      synced: 1,
    });
  }
};

const ordersPushTask: SyncTask = {
  name: "orders",
  async push() {
    const unsyncedOrders = (await readRows(localDbTables.orders)).filter(
      isUnsynced,
    );
    if (unsyncedOrders.length === 0) return 0;

    const markSynced = async (orders: typeof unsyncedOrders) => {
      for (const order of orders) {
        await upsertRow(localDbTables.orders, {
          ...order,
          synced: 1,
        });
      }
    };

    let totalPushed = 0;

    for (let i = 0; i < unsyncedOrders.length; i += BATCH_SIZE) {
      const batch = unsyncedOrders.slice(i, i + BATCH_SIZE);
      const orderPayloads = batch.map(normalizeOrderPayload);

      try {
        const resp = await ordersAdapter.syncBulk({
          orders: orderPayloads,
          payments: [],
        });
        // Only mark the orders the backend confirms it persisted. Anything it
        // skipped (e.g. unknown employee) stays unsynced and retries next cycle
        // — that is what stops offline orders from silently disappearing.
        const persisted = extractPersistedOrderIds(resp);
        const confirmed = persisted
          ? batch.filter((o: any) => persisted.has(String(o.id)))
          : batch;
        await markSynced(confirmed);
        totalPushed += confirmed.length;
        if (confirmed.length < batch.length) {
          console.warn(
            `[sync] Backend skipped ${batch.length - confirmed.length} order(s); kept unsynced for retry`,
          );
        }
      } catch (error) {
        const status = Number((error as any)?.response?.status);
        if (status !== 409) throw error;

        console.warn(
          "[sync] Orders batch hit a conflict; retrying one order at a time",
          error,
        );

        for (const order of batch) {
          try {
            const resp = await ordersAdapter.syncBulk({
              orders: [normalizeOrderPayload(order)],
              payments: [],
            });
            const persisted = extractPersistedOrderIds(resp);
            if (persisted && !persisted.has(String(order.id))) {
              console.warn(
                "[sync] Backend skipped order during retry; kept unsynced",
                { orderId: order.id },
              );
              continue;
            }
            await markSynced([order]);
            totalPushed += 1;
          } catch (singleError) {
            const singleStatus = Number((singleError as any)?.response?.status);
            if (singleStatus === 409) {
              console.warn(
                "[sync] Skipping conflicted order (already exists on server)",
                {
                  orderId: order.id,
                },
              );
              await upsertRow(localDbTables.orders, { ...order, synced: 1 });
              totalPushed += 1;
              continue;
            }
            throw singleError;
          }
        }
      }
    }

    return totalPushed;
  },
  async countUnsynced() {
    const unsyncedOrders = (await readRows(localDbTables.orders)).filter(
      isUnsynced,
    );
    return unsyncedOrders.length;
  },
};

const paymentsPushTask: SyncTask = {
  name: "payments",
  async push() {
    const unsyncedPayments = (await readRows(localDbTables.payments)).filter(
      isUnsynced,
    );
    if (unsyncedPayments.length === 0) return 0;

    const paymentEntries: Array<{ payment: any; payload: any }> = [];

    for (const payment of unsyncedPayments) {
      const payload = normalizePaymentPayload(payment);
      console.warn(
        "[sync] Skipping payment push because inventory is insufficient",
        {
          paymentId: payment.id,
          orderId: payment.order_id,
        },
      );

      paymentEntries.push({ payment, payload });
    }

    if (paymentEntries.length === 0) {
      return 0;
    }

    const syncPaymentsBatch = async (payloads: any[]) => {
      return ordersAdapter.syncBulk({ orders: [], payments: payloads });
    };

    const markSyncedFromResponse = async (
      entries: Array<{ payment: any; payload: any }>,
    ) => {
      await markPaymentsAsSynced(entries.map((entry) => entry.payment));
      return entries.length;
    };

    let totalPushed = 0;

    for (let i = 0; i < paymentEntries.length; i += BATCH_SIZE) {
      const batch = paymentEntries.slice(i, i + BATCH_SIZE);

      try {
        await syncPaymentsBatch(batch.map((entry) => entry.payload));
        totalPushed += await markSyncedFromResponse(batch);
      } catch (error) {
        const status = Number((error as any)?.response?.status);
        if (status !== 409) {
          throw error;
        }

        console.warn(
          "[sync] Payments batch hit a conflict; retrying one payment at a time",
          error,
        );

        for (const entry of batch) {
          try {
            await syncPaymentsBatch([entry.payload]);
            totalPushed += await markSyncedFromResponse([entry]);
          } catch (singleError) {
            const singleStatus = Number((singleError as any)?.response?.status);
            if (singleStatus === 409) {
              console.warn("[sync] Skipping conflicted payment during retry", {
                paymentId: entry.payment.id,
                orderId: entry.payment.order_id,
              });
              continue;
            }

            throw singleError;
          }
        }
      }
    }

    return totalPushed;
  },
  async countUnsynced() {
    const unsyncedPayments = (await readRows(localDbTables.payments)).filter(
      isUnsynced,
    );
    return unsyncedPayments.length;
  },
};

const expensesPushTask: SyncTask = {
  name: "expenses",
  async push() {
    const unsynced = (await readRows(localDbTables.expenses)).filter(
      (row) => isUnsynced(row) && syncableExpenseId(row),
    );
    if (unsynced.length === 0) return 0;

    let pushed = 0;
    for (const row of unsynced) {
      try {
        // POST is an idempotent upsert keyed by the local UUID, so this also
        // propagates offline edits without creating duplicates on retry.
        await apiClient.post("/expenses", normalizeExpenseForBackend(row));
        await upsertRow(localDbTables.expenses, { ...row, synced: 1 });
        pushed += 1;
      } catch (error) {
        console.error("[sync] Failed to push expense; kept unsynced", {
          id: row?.id,
          error,
        });
      }
    }
    return pushed;
  },
  async countUnsynced() {
    return (await readRows(localDbTables.expenses)).filter(
      (row) => isUnsynced(row) && syncableExpenseId(row),
    ).length;
  },
};

export const pushTasks: SyncTask[] = [
  ordersPushTask,
  paymentsPushTask,
  expensesPushTask,
];
