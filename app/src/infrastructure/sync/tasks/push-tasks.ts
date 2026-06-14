import { localDbTables, generateLocalId } from "@/db/localDb";
import {
  ordersAdapter,
  extractPersistedOrderIds,
} from "@/infrastructure/adapters/orders.adapter";
import { readRows, upsertRow } from "@/infrastructure/database/local-db-query";
import type { SyncTask } from "./types";

const BATCH_SIZE = 50;

const isUnsynced = (row: any) => Number(row?.synced ?? 0) === 0;

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

export const pushTasks: SyncTask[] = [ordersPushTask, paymentsPushTask];
