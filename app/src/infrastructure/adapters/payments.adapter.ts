// @ts-nocheck
import { Payment, ApiResponse } from "@/types/api.types";
import { generateLocalId, localDbTables } from "@/db/localDb";
import { api, isOnline } from "@/infrastructure/api/http-client";
import {
  findByIdOrRemote,
  readRows,
  upsertRow,
} from "@/infrastructure/database/local-db-query";
import { getApproximateServerIsoString } from "@/shared/utils/serverTime";

const readPayments = async () => {
  return readRows(localDbTables.payments);
};

const readOrders = async () => {
  return readRows(localDbTables.orders);
};

const findPayment = async (id: string) => {
  return findByIdOrRemote(localDbTables.payments, id);
};

const findOrder = async (id: string) => {
  return findByIdOrRemote(localDbTables.orders, id);
};

const upsertPayment = async (payment: any) => {
  return upsertRow(localDbTables.payments, payment);
};

const upsertOrder = async (order: any) => {
  return upsertRow(localDbTables.orders, order);
};

export const paymentsAdapter = {
  getAll: async (params?: any) => {
    // If online, fetch fresh data from backend
    if (isOnline()) {
      try {
        // Backend exposes GET /payments/history; empty filters return all payments
        const response = await api.get("/payments/history", { params });
        const remotePayments =
          response.data?.data?.payments ?? response.data?.payments ?? [];

        if (Array.isArray(remotePayments) && remotePayments.length > 0) {
          const localPayments = await readPayments();
          const syncedPayments = remotePayments.map((p: any) => {
            return {
              id: p.id,
              order_id: p.order_id,
              amount: p.amount,
              payment_method: p.payment_method,
              status: p.status,
              description: p.description || "",
              paid_at: p.paid_at,
              synced: 1,
              created_at: p.created_at,
              updated_at: p.updated_at,
            };
          });

          console.log(
            "[Payments Sync] Upserting",
            syncedPayments.length,
            "payments",
          );
          for (const payment of syncedPayments) {
            try {
              await upsertPayment(payment);
            } catch (upsertErr) {
              console.error("Failed to upsert payment:", payment, upsertErr);
              throw upsertErr;
            }
          }

          // Read fresh local payments which now includes the upserted remote payments
          // plus any local unsynced payments
          const freshLocalPayments = await readPayments();
          let updated = false;
          for (const p of freshLocalPayments) {
            if (p.payment_method === "cash" && p.status === "pending") {
              const next = { ...p, status: "paid", synced: 0 };
              await upsertPayment(next);
              p.status = "paid";
              updated = true;
            }
          }
          const baseFinal = updated
            ? await readPayments()
            : freshLocalPayments;
          // Local payment rows don't store order_number; carry it through from
          // the backend response so payment views can show/link it.
          const orderNumberById = new Map(
            remotePayments.map((p: any) => [p.id, p.order_number]),
          );
          const finalPayments = baseFinal.map((p: any) => ({
            ...p,
            order_number: p.order_number ?? orderNumberById.get(p.id) ?? null,
          }));

          return {
            data: { status: "success", data: { payments: finalPayments } },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as any,
          } as any;
        }
      } catch (err) {
        console.error("[Payments Sync] Failed to fetch from backend:", err);
        // Fall through to local data on error
      }
    }

    // Fallback to local data
    try {
      const localPayments = await readPayments();
      let updated = false;
      for (const p of localPayments) {
        if (p.payment_method === "cash" && p.status === "pending") {
          const next = { ...p, status: "paid", synced: 0 };
          await upsertPayment(next);
          p.status = "paid";
          updated = true;
        }
      }
      const finalPayments = updated ? await readPayments() : localPayments;
      return {
        data: { status: "success", data: { payments: finalPayments } },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      } as any;
    } catch (err) {
      const localPayments = await readPayments();
      return {
        data: { status: "success", data: { payments: localPayments } },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      } as any;
    }
  },
  getById: async (id: string) => {
    if (!isOnline()) {
      const payment = await findPayment(id);
      if (payment) {
        return {
          data: { status: "success", data: payment },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as any,
        };
      }
    }
    return api.get<ApiResponse<Payment>>(`/payments/${id}`);
  },
  getByOrder: async (orderId: string) => {
    const localPayments = (await readPayments()).filter(
      (payment: any) => String(payment.order_id) === String(orderId),
    );
    return {
      data: { status: "success", data: localPayments },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  create: async (paymentData: any) => {
    const paymentStatus = String(paymentData.status || "paid").toLowerCase();
    const isConfirmed = ["paid", "confirmed"].includes(paymentStatus);
    const isDeleted = paymentStatus === "deleted";

    // Helper: update local order status after a payment action
    const syncOrderLocally = async (orderId: string, synced: 0 | 1) => {
      if (!orderId) return;
      const localOrder = await findOrder(orderId);
      if (localOrder?.id) {
        const newStatus = isConfirmed
          ? "paid"
          : isDeleted
            ? "cancelled"
            : localOrder.status;
        const newPaymentStatus = isConfirmed
          ? "paid"
          : isDeleted
            ? "cancelled"
            : localOrder.payment_status;
        await upsertOrder({
          ...localOrder,
          status: newStatus,
          payment_status: newPaymentStatus,
          is_printed: isConfirmed ? 1 : localOrder.is_printed,
          updated_at: getApproximateServerIsoString(),
          synced,
        });
      }
    };

    // ── ONLINE: push directly via sync endpoint ───────────────────────────────
    if (isOnline()) {
      try {
        const paymentId = generateLocalId();
        const syncPayload = {
          id: paymentId,
          order_id: paymentData.order_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          status: paymentStatus,
          processed_by: paymentData.processed_by,
          description: paymentData.description || undefined,
          paid_at: getApproximateServerIsoString(),
        };

        await api.post("/orders/sync", { orders: [], payments: [syncPayload] });

        // Save locally as synced
        await upsertPayment({ ...syncPayload, synced: 1 } as any);
        await syncOrderLocally(paymentData.order_id, 1);

        return {
          data: {
            status: "success",
            data: { payment: syncPayload, ...syncPayload },
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as any,
        } as any;
      } catch {
        // fall through to offline path
      }
    }

    // ── OFFLINE (or online fallback): save locally, queue for sync ────────────
    const paymentId = generateLocalId();
    const localPayment = {
      id: paymentId,
      synced: 0,
      order_id: paymentData.order_id,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      status: paymentStatus,
      description: paymentData.description || "",
      paid_at: getApproximateServerIsoString(),
      created_at: getApproximateServerIsoString(),
      updated_at: getApproximateServerIsoString(),
    };

    await upsertPayment(localPayment as any);
    await syncOrderLocally(paymentData.order_id, 0);

    return {
      data: {
        status: "success",
        data: {
          payment: { id: paymentId, ...localPayment },
          id: paymentId,
          ...localPayment,
        },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any;
  },

  createWithQR: async (paymentData: any) => {
    return paymentsApi.create({ ...paymentData, payment_method: "qr_code" });
  },

  updateStatus: async (id: string, statusData: any) => {
    if (id) {
      const localPayment = await findPayment(id);
      if (localPayment && localPayment.id) {
        await upsertPayment({
          ...localPayment,
          status: statusData.status || localPayment.status,
          synced: 0,
        });
      }
    }
    return {
      data: { status: "success" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  generateQR: async (id: string) => {
    await findPayment(id);
    // QR generation is mocked locally - return empty data
    return {
      data: { status: "success", data: { qr_url: "", qr_data: "" } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  confirm: async (id: string, data: any) => {
    let localPaymentObj: any = null;
    let isSynced = 0 as 0 | 1;

    if (id && isOnline()) {
      try {
        await api.post(`/payments/${id}/confirm`, data);
        isSynced = 1;
      } catch {
        // fall through to local
      }
    }

    // Update local payment in SQLite
    if (id) {
      try {
        const localPayment = await findPayment(id);

        if (localPayment && localPayment.id) {
          await upsertPayment({
            ...localPayment,
            status: "paid",
            paid_at: getApproximateServerIsoString(),
            synced: isSynced,
          });
          localPaymentObj = {
            ...localPayment,
            status: "paid",
            paid_at: getApproximateServerIsoString(),
            synced: isSynced,
          };

          // Also update parent order in SQLite
          if (localPayment.order_id) {
            const localOrder = await findOrder(localPayment.order_id);

            if (localOrder && localOrder.id) {
              await upsertOrder({
                ...localOrder,
                status: "paid",
                payment_status: "paid",
                is_printed: 1,
                updated_at: getApproximateServerIsoString(),
                synced: isSynced,
              });
            } else {
              await upsertOrder({
                id: localPayment.order_id,
                status: "paid",
                payment_status: "paid",
                synced: 1,
                total_amount: localPayment.amount || 0,
                created_at: getApproximateServerIsoString(),
                is_printed: 1,
                items: [],
              });
            }
          }
        }
      } catch (err) {
        // ignore
      }
    }

    return {
      data: {
        status: "success",
        data: {
          payment: localPaymentObj || { id, status: "paid" },
        },
        payment: localPaymentObj || { id, status: "paid" },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any;
  },
  getPending: async (params?: any) => {
    try {
      const localPayments = await readPayments();
      let updated = false;
      for (const p of localPayments) {
        if (p.payment_method === "cash" && p.status === "pending") {
          await upsertPayment({ ...p, status: "paid", synced: 0 });
          p.status = "paid";
          updated = true;
        }
      }
      const finalPayments = updated ? await readPayments() : localPayments;
      const pendingLocal = finalPayments.filter((p) => p.status === "pending");
      return {
        data: { status: "success", data: { payments: pendingLocal } },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      } as any;
    } catch (err) {
      const localPayments = await readPayments();
      const pendingLocal = localPayments.filter((p) => p.status === "pending");
      return {
        data: { status: "success", data: { payments: pendingLocal } },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      } as any;
    }
  },
  verifyQR: async (qrData: any) => {
    // QR verification is mocked locally - return mock verification result
    return {
      data: { status: "success", data: { verified: true } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
};
