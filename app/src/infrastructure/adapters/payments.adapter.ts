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

// How far back the dashboard reconciles payments from the backend on each
// refresh. Without a bound, GET /payments/history returns the branch's entire
// payment history (every refresh re-pulls and re-upserts all of it), which is
// what makes the cashier dashboard crawl on long-running tills. Local SQLite
// still retains older rows from prior syncs, so client-side stats over older
// ranges keep working — we just stop re-fetching the unchanging tail.
const PAYMENTS_HISTORY_WINDOW_DAYS = 60;

const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

// Fields that decide whether a remote payment row differs from what we already
// have locally. Re-upserting an unchanged row is pure overhead (a SQLite write
// per row, every refresh) — skipping them removes the per-load write storm.
const PAYMENT_COMPARE_FIELDS = [
  "order_id",
  "amount",
  "payment_method",
  "status",
  "description",
  "paid_at",
  "updated_at",
];

const paymentRowChanged = (existing: any, incoming: any): boolean => {
  if (!existing) return true;
  // A local row not yet marked synced must be reconciled to the server copy.
  if (Number(existing.synced ?? 0) !== 1) return true;
  for (const field of PAYMENT_COMPARE_FIELDS) {
    if (String(existing[field] ?? "") !== String(incoming[field] ?? "")) {
      return true;
    }
  }
  return false;
};

// Offline cash payments are written as pending; once we can see them they are
// settled, so promote them to paid. Only the (usually zero) matching rows get
// written. Returns true if anything changed so the caller can re-read.
const promoteCashPendingToPaid = async (rows: any[]): Promise<boolean> => {
  let updated = false;
  for (const p of rows) {
    if (p.payment_method === "cash" && p.status === "pending") {
      await upsertPayment({ ...p, status: "paid", synced: 0 });
      p.status = "paid";
      updated = true;
    }
  }
  return updated;
};

const buildPaymentsResponse = (payments: any[]) =>
  ({
    data: { status: "success", data: { payments } },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as any,
  }) as any;

// Read-only local payments response — no network, no reconcile loop beyond the
// cheap cash/pending promotion. Used for the fast initial render and the
// lightweight on-screen refresh tick.
const localPaymentsResponse = async () => {
  const localPayments = await readPayments();
  const updated = await promoteCashPendingToPaid(localPayments);
  const finalPayments = updated ? await readPayments() : localPayments;
  return buildPaymentsResponse(finalPayments);
};

export const paymentsAdapter = {
  getAll: async (params?: any, opts?: { localOnly?: boolean }) => {
    // Fast path: render straight from local SQLite without touching the network
    // or reconciling the full history. Keeps the dashboard responsive.
    if (opts?.localOnly) {
      return localPaymentsResponse();
    }

    // If online, reconcile a bounded recent window from the backend.
    if (isOnline()) {
      try {
        // Bound the pull to a recent window unless the caller asked for a
        // specific slice. Passing only date_from returns every payment in the
        // window (unpaginated) instead of the whole table.
        const query: any = { ...(params || {}) };
        if (
          query.date_from == null &&
          query.date_to == null &&
          query.limit == null &&
          query.page == null
        ) {
          query.date_from = isoDaysAgo(PAYMENTS_HISTORY_WINDOW_DAYS);
        }

        const response = await api.get("/payments/history", { params: query });
        const remotePayments =
          response.data?.data?.payments ?? response.data?.payments ?? [];

        if (Array.isArray(remotePayments) && remotePayments.length > 0) {
          const existingLocal = await readPayments();
          const existingById = new Map<string, any>(
            existingLocal.map((p: any) => [String(p.id), p]),
          );

          let upsertCount = 0;
          for (const p of remotePayments) {
            const incoming = {
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
            // Only write rows that are new or actually changed.
            if (!paymentRowChanged(existingById.get(String(p.id)), incoming)) {
              continue;
            }
            try {
              await upsertPayment(incoming);
              upsertCount += 1;
            } catch (upsertErr) {
              console.error("Failed to upsert payment:", incoming, upsertErr);
              throw upsertErr;
            }
          }

          if (upsertCount > 0) {
            console.log("[Payments Sync] Upserted", upsertCount, "payments");
          }

          // Read fresh local payments which now includes the upserted remote
          // payments plus any local unsynced payments.
          const freshLocalPayments = await readPayments();
          const updated = await promoteCashPendingToPaid(freshLocalPayments);
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

          return buildPaymentsResponse(finalPayments);
        }
      } catch (err) {
        console.error("[Payments Sync] Failed to fetch from backend:", err);
        // Fall through to local data on error
      }
    }

    // Fallback to local data
    try {
      return await localPaymentsResponse();
    } catch (err) {
      const localPayments = await readPayments();
      return buildPaymentsResponse(localPayments);
    }
  },
  // Backend-paginated payment history for the management table. Returns a single
  // server page (rows + total count) instead of the whole local table. When
  // online the page comes straight from GET /payments/history (also cached into
  // local SQLite for offline continuity); when offline we filter/sort/slice the
  // local rows to mirror the same shape.
  getHistory: async (params?: any) => {
    const page = Math.max(Number(params?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params?.limit) || 25, 1), 100);

    const buildPage = (rows: any[], count: number, stats: any = null) =>
      ({
        data: {
          status: "success",
          data: { payments: rows, count, page, limit, stats },
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      }) as any;

    if (isOnline()) {
      try {
        const query: any = { ...(params || {}), page, limit };
        const response = await api.get("/payments/history", { params: query });
        const payload = response.data?.data ?? response.data ?? {};
        const remotePayments: any[] = payload.payments ?? [];

        // Best-effort cache into local SQLite so the same rows stay available
        // offline. Only write rows that are new or actually changed.
        try {
          const existingLocal = await readPayments();
          const existingById = new Map<string, any>(
            existingLocal.map((p: any) => [String(p.id), p]),
          );
          for (const p of remotePayments) {
            const incoming = {
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
            if (paymentRowChanged(existingById.get(String(p.id)), incoming)) {
              await upsertPayment(incoming);
            }
          }
        } catch (cacheErr) {
          console.error("[Payments History] local cache failed:", cacheErr);
        }

        return buildPage(
          remotePayments,
          Number(payload.count ?? remotePayments.length),
          payload.stats ?? null,
        );
      } catch (err) {
        console.error("[Payments History] fetch failed, using local:", err);
        // fall through to local slicing
      }
    }

    // Offline / fallback: filter, sort and slice local rows to the same shape.
    const all = await readPayments();
    await promoteCashPendingToPaid(all);
    const fresh = await readPayments();

    const status = params?.status;
    const method = params?.payment_method;
    const search = String(params?.search ?? "").trim().toLowerCase();

    const filtered = fresh.filter((p: any) => {
      if (status && p.status !== status) return false;
      if (method && p.payment_method !== method) return false;
      if (search) {
        const hay =
          `${p.id} ${p.order_id} ${p.payment_method ?? ""} ${p.status ?? ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    filtered.sort((a: any, b: any) => {
      const ta = new Date(a.paid_at || a.created_at || 0).getTime();
      const tb = new Date(b.paid_at || b.created_at || 0).getTime();
      return tb - ta;
    });

    const count = filtered.length;
    const start = (page - 1) * limit;
    return buildPage(filtered.slice(start, start + limit), count);
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
                // On the desktop POS, taking payment closes the order, so the
                // lifecycle moves to "done" (collapsed vocab) while the money
                // axis records "paid".
                status: "done",
                payment_status: "paid",
                is_printed: 1,
                updated_at: getApproximateServerIsoString(),
                synced: isSynced,
              });
            } else {
              await upsertOrder({
                id: localPayment.order_id,
                status: "done",
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
