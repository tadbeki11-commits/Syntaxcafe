// @ts-nocheck
import {
  generateLocalId,
  getLocalDb,
  localDbTables,
  LocalOrder,
} from "@/db/localDb";
import {
  api,
  isOnline,
  generateEscPosBase64,
} from "@/infrastructure/api/http-client";
import {
  getPrinterForDepartment,
  getDepartmentStations,
  getActivePrinterName,
  getSimplePrintMode,
  getTicketShowPrices,
  getPrintCopies,
} from "@/infrastructure/printing/printer-config";
import { eq } from "drizzle-orm";
import {
  findById,
  findByIdOrRemote,
  readRows,
  upsertRow,
} from "@/infrastructure/database/local-db-query";
import {
  getApproximateServerDate,
  getApproximateServerIsoString,
} from "@/shared/utils/serverTime";
import { checkOrderInventoryAvailability } from "@/application/inventory/order-inventory.service";
import { settingsAdapter } from "@/infrastructure/adapters/settings.adapter";
import { renderReceiptImage, ReceiptBlock } from "@/utils/receiptImage";
import { formatOrderNumber } from "@/lib/utils";

const DEFAULT_WAITER_NAME = "Waiter";
const DEFAULT_CATEGORY = "cafe";
const DEFAULT_ORDER_STATUS = "pending";
const DEFAULT_PAYMENT_STATUS = "pending";
const DEFAULT_TABLE_COLUMN_WIDTHS = [12, 36];
const DEFAULT_TABLE_COLUMN_ALIGNS: ("left" | "right")[] = ["left", "right"];

// Kitchen ticket lines: quantity and item name each centered within their column,
// matching the centered header/meta lines on the rest of the ticket.
const ORDER_TICKET_COLUMN_WIDTHS = [8, 40];
const ORDER_TICKET_COLUMN_ALIGNS: ("left" | "right" | "center")[] = [
  "center",
  "center",
];

/**
 * Word-wrap free text (e.g. an order note) into lines that fit an 80mm ticket.
 * The receipt `text` block doesn't wrap — it ellipsis-truncates — so a long note
 * would otherwise be cut off. ~40 chars/line is conservative for the bold font.
 */
const wrapTicketText = (text: string, maxChars = 40): string[] => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // Hard-break a single token longer than the line width.
    line = word;
    while (line.length > maxChars) {
      lines.push(line.slice(0, maxChars));
      line = line.slice(maxChars);
    }
  }
  if (line) lines.push(line);
  return lines;
};

const findOrder = async (id: string) => {
  return findByIdOrRemote(localDbTables.orders, id);
};

const findUser = async (id: string) => {
  return findById(localDbTables.users, id);
};

const resolveWaiterName = async (order: any): Promise<string> => {
  const waiterId =
    order?.waiter_id ?? order?.employee_id ?? order?.created_by_id;
  if (!waiterId) return DEFAULT_WAITER_NAME;
  const waiterUser = await findUser(String(waiterId));
  if (!waiterUser) return DEFAULT_WAITER_NAME;
  return (
    [waiterUser.first_name, waiterUser.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    waiterUser.full_name ||
    waiterUser.name ||
    waiterUser.username ||
    DEFAULT_WAITER_NAME
  );
};

const extractMenuMainCategory = (menuItem: any) =>
  String((menuItem as any)?.main_category || "")
    .trim()
    .toLowerCase();

const resolveItemCategory = async (
  item: any,
  fallback: string = DEFAULT_CATEGORY,
): Promise<string> => {
  const menuItemId = item?.menu_item_id ? String(item.menu_item_id) : "";
  if (menuItemId) {
    const menuItem = await findByIdOrRemote(
      localDbTables.menuItems,
      menuItemId,
    );
    const menuMain = extractMenuMainCategory(menuItem);
    if (menuMain) return menuMain;
  }

  const explicitMain = String(item?.main_category || "")
    .trim()
    .toLowerCase();
  if (explicitMain) return explicitMain;

  const legacyType = String(item?.item_type || "")
    .trim()
    .toLowerCase();
  if (legacyType) return legacyType;

  return fallback;
};

const KITCHEN_PRINT_STATUSES = new Set(["pending", "preparing", "ready"]);

const buildResponse = (data: any, status: number = 200) => ({
  data: { status: "success", ...data },
  status,
  statusText: status === 200 ? "OK" : "Error",
  headers: {},
  config: {} as any,
});

const buildErrorResponse = (message: string, status: number = 404) =>
  ({
    data: { status: "error", message },
    status,
    statusText: status === 404 ? "Not Found" : "Error",
    headers: {},
    config: {} as any,
  }) as any;

const updateOrderWithChanges = async (id: string, changes: any) => {
  const order = await findOrder(id);
  if (order && order.id) {
    await upsertOrder({
      ...order,
      ...changes,
      updated_at: getApproximateServerIsoString(),
      synced: 0,
    });
  }
  return buildResponse({});
};

const printerDisplayName = (p: any): string =>
  typeof p === "string" ? p : String(p?.name || p?.address || "").trim();

/** Names of the printers CUPS currently knows about (trimmed, non-empty). */
const listAvailablePrinters = async (): Promise<string[]> => {
  const { list_thermal_printers } =
    await import("tauri-plugin-thermal-printer");
  const printers = ((await list_thermal_printers()) as any[]) || [];
  return printers.map(printerDisplayName).filter(Boolean);
};

/**
 * Resolve a desired printer name to one that actually exists in CUPS.
 *
 * `lp -d <name> -o raw` exits non-zero ("The printer or class does not exist")
 * when handed a name CUPS doesn't have — which the thermal-printer plugin
 * surfaces as the opaque "lp command failed" error. A stale/typo'd entry in the
 * department→printer map (read via getActivePrinterName / getPrinterForDepartment)
 * is the usual cause. Only honor the requested name if it's live; otherwise fall
 * back to the first available printer so the job still prints.
 */
const resolvePrinter = (
  desired: string | undefined,
  available: string[],
): string => {
  const requested = String(desired || "").trim();
  if (requested && available.includes(requested)) return requested;
  if (requested && available.length > 0) {
    console.warn(
      `[print] Printer "${requested}" not found in CUPS; falling back to "${available[0]}". Available: ${available.join(", ") || "(none)"}`,
    );
  }
  return available[0] || requested;
};

const selectPrinter = async (printerName?: string): Promise<string> => {
  const available = await listAvailablePrinters();
  return resolvePrinter(printerName, available);
};

const createPrintJob = (imageData: string, printer: string) => ({
  printer,
  paper_size: "Mm80",
  options: {
    code_page: 6,
    encode: "WINDOWS_1252",
  },
  sections: [
    {
      Image: {
        data: imageData,
        max_width: 0,
        align: "center",
        dithering: false,
        size: "normal",
      },
    },
    { Feed: { feed_type: "lines", value: 3 } },
    { Cut: { mode: "partial", feed: 0 } },
  ],
});

// Filter local orders by the query params the UI passes (employee/waiter, type).
// The cashier "Employees" page relies on employee_id to scope orders to the
// selected waiter, so an order matches when either employee_id or waiter_id
// equals the requested id.
const filterOrdersByParams = (orders: any[], params?: any) => {
  if (!params) return orders;

  let result = orders;

  const employeeId = params.employee_id ?? params.waiter_id;
  if (employeeId != null && employeeId !== "") {
    const id = String(employeeId);
    result = result.filter(
      (o) =>
        String(o?.employee_id || "") === id ||
        String(o?.waiter_id || "") === id,
    );
  }

  if (params.type) {
    const type = String(params.type).toLowerCase();
    result = result.filter((o) => String(o?.type || "").toLowerCase() === type);
  }

  return result;
};

const isOrderMarkedPrinted = (order: any) =>
  Number(order?.is_printed) === 1 || Number(order?.meta?.is_printed) === 1;

const shouldAutoPrintOrder = (order: any) => {
  const status = String(order?.status || "")
    .trim()
    .toLowerCase();
  const paymentStatus = String(order?.payment_status || "")
    .trim()
    .toLowerCase();
  if (!KITCHEN_PRINT_STATUSES.has(status)) return false;
  if (paymentStatus === "paid") return false;
  if (isOrderMarkedPrinted(order)) return false;
  return true;
};

const upsertOrder = async (order: any) => {
  return upsertRow(localDbTables.orders, order);
};

/** Shape a backend order row into the local-DB order record. */
const mapServerOrderToLocal = (remote: any, cached?: any) => ({
  id: remote.id,
  order_number: remote.order_number ?? cached?.order_number ?? null,
  employee_id: remote.employee_id,
  waiter_id: remote.waiter_id,
  created_by_id: remote.created_by_id,
  order_source: remote.order_source,
  organization_id: remote.organization_id,
  type: remote.type,
  status: remote.status,
  payment_status: remote.payment_status,
  total_amount: remote.total_amount,
  notes: remote.notes,
  table_number: remote.table_number,
  items: remote.items || [],
  synced: 1,
  // Keep the local print flag so a pull/socket refresh never re-queues an
  // order we've already printed at this station.
  is_printed: cached?.is_printed || 0,
  created_at: remote.created_at,
  updated_at: remote.updated_at,
});

/**
 * Persist backend order rows into the local DB. Used by the realtime socket
 * (instant path) and the orders pull sync task (catch-up path) so orders
 * created on other devices — e.g. the web waiter app — show up in the local
 * cashier list, which reads exclusively from the local DB.
 */
// A cancellation/void is terminal and authoritative wherever it originates (e.g.
// the web cashier). When the server reports one of these states it must override
// the local copy even if that copy has unsynced edits — otherwise a stale local
// "paid" row would resurrect the order on the next push/pull.
const TERMINAL_VOID_STATUSES = new Set([
  "cancelled",
  "canceled",
  "voided",
  "deleted",
  "refunded",
]);

export const persistServerOrders = async (remoteOrders: any[]) => {
  if (!Array.isArray(remoteOrders) || remoteOrders.length === 0) return 0;
  const localOrders = await readRows(localDbTables.orders);
  let localPayments: any[] | null = null;
  let count = 0;
  for (const remote of remoteOrders) {
    if (!remote?.id) continue;
    const cached = localOrders.find((c: any) => c?.id === remote.id);
    const remoteVoided = TERMINAL_VOID_STATUSES.has(
      String(remote?.status || "").toLowerCase(),
    );
    // Never clobber a locally-created order that hasn't been pushed yet — UNLESS
    // the server says it's cancelled/voided, which always wins and stops the
    // local copy from being re-pushed (mapServerOrderToLocal marks it synced).
    if (cached && Number(cached.synced ?? 0) === 0 && !remoteVoided) continue;
    await upsertOrder(mapServerOrderToLocal(remote, cached));
    count += 1;

    // Mirror the desktop's own cancel workflow: a voided order's local payments
    // are voided too, so a stale paid/pending record can't re-assert "paid" on
    // the next sync and the ledger shows the order as deleted.
    if (remoteVoided) {
      if (localPayments === null) {
        localPayments = await readRows(localDbTables.payments);
      }
      for (const p of localPayments) {
        if (
          p?.order_id === remote.id &&
          !TERMINAL_VOID_STATUSES.has(String(p?.status || "").toLowerCase())
        ) {
          await upsertRow(localDbTables.payments, {
            ...p,
            status: "cancelled",
            synced: 1,
          });
          p.status = "cancelled";
        }
      }
    }
  }
  return count;
};

/**
 * Given a `/orders/sync` response, return the set of order ids the backend
 * confirms it actually persisted (created or already-present). Returns null for
 * older backends that don't report this — callers then treat the whole pushed
 * batch as accepted (legacy behaviour). Anything pushed but NOT in this set was
 * skipped server-side and must stay unsynced so it retries instead of being
 * silently lost.
 */
export const extractPersistedOrderIds = (resp: any): Set<string> | null => {
  const body = resp?.data?.data ?? resp?.data ?? {};
  const ids = body?.persisted_ids;
  if (!Array.isArray(ids)) return null;
  return new Set(ids.map((id: any) => String(id)));
};

export const normalizeOrderPayload = (order: any) => ({
  id: order.id,
  employee_id: order.employee_id,
  waiter_id: order.waiter_id || "",
  // Carries who actually placed the order. When it differs from waiter_id the
  // backend records it as the cashier so the order is marked "placed by cashier".
  created_by_id: order.created_by_id || "",
  customer_id: order.customer_id,
  table_number: order.table_number || "",
  order_type_label: order.order_type_label || "",
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
      main_category: item.main_category,
      note: item.note || undefined,
    })) || [],
  total_amount: order.total_amount,
});

const syncUnsyncedOrders = async () => {
  const localOrders = await readRows(localDbTables.orders);
  const unsyncedOrders = localOrders.filter(
    (o: any) => Number(o?.synced ?? 0) === 0,
  );
  if (unsyncedOrders.length === 0) return;

  const BATCH_SIZE = 50;

  for (let i = 0; i < unsyncedOrders.length; i += BATCH_SIZE) {
    const batch = unsyncedOrders.slice(i, i + BATCH_SIZE);
    const orderPayloads = batch.map(normalizeOrderPayload);

    try {
      const resp = await api.post("/orders/sync", {
        orders: orderPayloads,
        payments: [],
      });
      const persisted = extractPersistedOrderIds(resp);
      const confirmed = persisted
        ? batch.filter((o: any) => persisted.has(String(o.id)))
        : batch;
      for (const order of confirmed) {
        await upsertRow(localDbTables.orders, { ...order, synced: 1 });
      }
      const skipped = batch.length - confirmed.length;
      console.log(
        "[Orders Sync] Pushed",
        confirmed.length,
        "unsynced orders" + (skipped > 0 ? `; ${skipped} kept for retry` : ""),
      );
    } catch (error) {
      const status = Number((error as any)?.response?.status);
      if (status !== 409) throw error;

      console.warn("[Orders Sync] Batch conflict, retrying individually");
      for (const order of batch) {
        try {
          await api.post("/orders/sync", {
            orders: [normalizeOrderPayload(order)],
            payments: [],
          });
          await upsertRow(localDbTables.orders, { ...order, synced: 1 });
        } catch (singleError) {
          const singleStatus = Number((singleError as any)?.response?.status);
          if (singleStatus === 409) {
            console.warn("[Orders Sync] Skipping conflicted order", {
              orderId: order.id,
            });
            await upsertRow(localDbTables.orders, { ...order, synced: 1 });
            continue;
          }
          throw singleError;
        }
      }
    }
  }
};

const normalizeOrderItemsForPrinting = async (items: any[]) => {
  return Promise.all(
    (items || []).map(async (item: any) => {
      const mainCategory = await resolveItemCategory(item);
      return {
        ...item,
        id: item.id || generateLocalId(),
        main_category: mainCategory,
        item_type:
          String(item?.item_type || "")
            .trim()
            .toLowerCase() || mainCategory,
      };
    }),
  );
};

const ordersAdapterImpl = {
  getAll: async (params?: any) => {
    if (isOnline()) {
      try {
        await syncUnsyncedOrders();
        const response = await api.get("/orders", { params });
        const remoteOrders =
          response.data?.data?.orders ?? response.data?.orders ?? [];

        if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
          const upserted = await persistServerOrders(remoteOrders);
          console.log("[Orders Sync] Upserting", upserted, "orders");

          const freshLocalOrders = await readRows(localDbTables.orders);
          const filtered = filterOrdersByParams(freshLocalOrders, params);
          return {
            data: { status: "success", data: filtered },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as any,
          };
        }
      } catch (err) {
        console.error("[Orders Sync] Failed to fetch from backend:", err);
      }
    }

    // Fallback to local data
    const localOrders = await readRows(localDbTables.orders);
    const filtered = filterOrdersByParams(localOrders, params);

    return {
      data: { status: "success", data: filtered },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getById: async (id: string) => {
    let order = await findOrder(id);

    // The local cashier list only pulls active orders, so a completed/paid
    // order (or one created on another device) may be missing locally, or
    // present but stripped of its items. When online, fetch the full order
    // from the backend and cache it so the detail view has its items.
    const hasItems = Array.isArray(order?.items) && order.items.length > 0;
    if ((!order || !hasItems) && isOnline()) {
      try {
        const resp = await api.get(`/orders/${id}`);
        const remote =
          resp.data?.data?.order ?? resp.data?.order ?? null;
        if (remote?.id) {
          await persistServerOrders([remote]);
          order = await findOrder(id);
        }
      } catch (err) {
        console.warn("[Orders getById] Backend fetch failed:", err);
      }
    }

    if (order) {
      const waiterName = await resolveWaiterName(order);
      order = { ...order, waiter_name: waiterName, employee_name: waiterName };
      return {
        data: {
          status: "success",
          data: { order: order },
          order: order,
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };
    }

    return {
      data: { status: "error", message: "Order not found offline" },
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any;
  },

  syncBulk: async (data: any) => {
    if (isOnline()) {
      return api.post("/orders/sync", data, { timeout: 650000 });
    }

    throw new Error("Offline");
  },

  create: (orderData: any) => ordersAdapterImpl.createCafe(orderData),

  createCafe: async (orderData: any) => {
    const orderId = generateLocalId();
    const normalizedItems = await normalizeOrderItemsForPrinting(
      orderData.items || [],
    );

    const { allow_low_stock_orders } =
      await settingsAdapter.getLocalInventorySettings();
    const { force_table_selection } =
      await settingsAdapter.getLocalTableSelectionSettings();

    if (
      force_table_selection &&
      (!orderData.table_number ||
        isNaN(parseInt(String(orderData.table_number), 10)))
    ) {
      return Promise.reject({
        response: {
          status: 400,
          data: {
            status: "error",
            error: "table_required",
            message: "Table selection is required to create an order.",
          },
        },
      });
    }

    if (!allow_low_stock_orders) {
      const inventoryCheck = await checkOrderInventoryAvailability(
        normalizedItems.map((item) => ({
          ...item,
          menu_item_id: String(item.menu_item_id),
          quantity: Number(item.quantity),
        })),
      );

      if (!inventoryCheck.available) {
        return Promise.reject({
          response: {
            status: 409,
            data: {
              status: "error",
              error: "insufficient_inventory",
              message: "Not enough inventory to create this order.",
              details: inventoryCheck.shortfalls,
            },
          },
        });
      }
    }

    const localOrder: LocalOrder = {
      id: orderId,
      synced: 0,
      is_printed: 0,
      employee_id: orderData.employee_id,
      waiter_id: orderData.waiter_id || orderData.employee_id,
      created_by_id: orderData.created_by_id || orderData.employee_id,
      type: orderData.type || DEFAULT_CATEGORY,
      status: DEFAULT_ORDER_STATUS,
      payment_status: DEFAULT_PAYMENT_STATUS,
      total_amount: orderData.total_amount,
      organization_id: orderData.organization_id ?? null,
      is_price_override: Boolean(orderData.is_price_override),
      notes: orderData.notes || "",
      table_number: orderData.table_number || null,
      created_at: getApproximateServerIsoString(),
      updated_at: getApproximateServerIsoString(),
      items: normalizedItems,
    };

    if (isOnline()) {
      try {
        const resp = await api.post("/orders/sync", {
          orders: [normalizeOrderPayload(localOrder)],
          payments: [],
        });
        // Only mark synced if the backend confirms it actually stored the order;
        // otherwise leave it unsynced so the sync engine retries it later.
        const persisted = extractPersistedOrderIds(resp);
        if (!persisted || persisted.has(String(orderId))) {
          localOrder.synced = 1;
        } else {
          console.warn(
            "[Orders Create] Backend skipped order; keeping it unsynced for retry",
            orderId,
          );
        }
        // Adopt the backend-assigned serial so the cashier sees the official
        // order number immediately instead of waiting for the next pull.
        const assigned = (resp?.data?.data?.orders ?? []).find(
          (o: any) => o?.id === orderId,
        );
        if (assigned?.order_number != null) {
          localOrder.order_number = assigned.order_number;
        }
        console.log("[Orders Create] Successfully synced order immediately");
      } catch (err) {
        console.warn("[Orders Create] Failed to sync order immediately:", err);
      }
    }

    await upsertOrder(localOrder);

    return {
      data: { status: "success", data: { id: orderId, ...localOrder } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  updateStatus: async (id: string, statusData: any) => {
    if (!id) return buildResponse({});
    if (isOnline()) {
      try {
        await api.put(`/orders/${id}/status`, statusData);
        const order = await findOrder(id);
        if (order?.id) {
          await upsertOrder({
            ...order,
            status: statusData.status,
            updated_at: getApproximateServerIsoString(),
            synced: 1,
          });
        }
        return buildResponse({});
      } catch {
        // fall through to local
      }
    }
    // Offline — queue for push task
    return updateOrderWithChanges(id, { status: statusData.status });
  },

  updateItems: async (id: string, itemsData: any) => {
    return updateOrderWithChanges(id, { items: itemsData.items });
  },
  addItems: async (id: string, itemsData: any) => {
    let order = await findOrder(id);
    if (order && order.id) {
      const normalizedNewItems = await normalizeOrderItemsForPrinting(
        itemsData.items || [],
      );
      const updatedItems = [...(order.items || []), ...normalizedNewItems];
      await upsertOrder({
        ...order,
        items: updatedItems,
        updated_at: getApproximateServerIsoString(),
        synced: 0,
      });
    }
    return {
      data: { status: "success" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  markReady: async (id: string, data: any) => {
    // Lifecycle collapsed to {pending, done, cancelled}: "ready" is "done".
    return updateOrderWithChanges(id, { status: "done" });
  },
  complete: async (id: string, data: any) => {
    return updateOrderWithChanges(id, { status: "done" });
  },
  getPending: async (params?: any) => {
    const localOrders = await readRows(localDbTables.orders);
    const pendingLocal = localOrders.filter((o) => o.status === "pending");

    return {
      data: { status: "success", data: pendingLocal },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getReady: async (params?: any) => {
    const localOrders = await readRows(localDbTables.orders);
    const readyLocal = localOrders.filter((o) => o.status === "done");

    return {
      data: { status: "success", data: readyLocal },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getKitchenOrders: async () => {
    const localOrders = await readRows(localDbTables.orders);
    const kitchenOrders = localOrders.filter(
      (o) => o.type === "cafe" && o.status === "pending",
    );
    return {
      data: { status: "success", data: kitchenOrders },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getStatusHistory: async (id: string) => {
    let order = await findOrder(id);
    // Return mock status history based on current order status
    const history = order
      ? [
          {
            status: order.status,
            timestamp: order.updated_at,
            notes: "Order status updated locally",
          },
        ]
      : [];
    return {
      data: { status: "success", data: history },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getOrdersForPayment: async (params?: any) => {
    const localOrders = await readRows(localDbTables.orders);
    const scopedOrders = filterOrdersByParams(localOrders, params);
    // Awaiting-payment queue: exclude anything already closed. With the
    // collapsed vocab a paid order is `done`, so the old check (completed/paid)
    // missed them and they leaked back into the queue. Key off the payment axis
    // and exclude the terminal lifecycle states (legacy values kept tolerant).
    const activeLocalOrders = scopedOrders.filter((o) => {
      const st = String(o.status || "").toLowerCase();
      const pst = String(o.payment_status || "").toLowerCase();
      return (
        pst !== "paid" &&
        st !== "done" &&
        st !== "cancelled" &&
        st !== "completed" &&
        st !== "paid"
      );
    });

    const ordersWithWaiter = await Promise.all(
      activeLocalOrders.map(async (order) => {
        const waiterName = await resolveWaiterName(order);
        return { ...order, waiter_name: waiterName, employee_name: waiterName };
      }),
    );

    return {
      data: {
        status: "success",
        data: { orders: ordersWithWaiter },
        orders: ordersWithWaiter,
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any;
  },
  getOccupiedTables: async () => {
    const localOrders = await readRows(localDbTables.orders);
    const occupiedOrders = localOrders.filter(
      (o) =>
        o.type === "cafe" &&
        // A table is occupied while its order is still open. With the collapsed
        // vocab that is just "pending" (preparing/ready folded into it).
        o.status === "pending" &&
        o.table_number != null,
    );

    occupiedOrders.sort((a, b) => {
      const ta = parseInt(String(a.table_number), 10);
      const tb = parseInt(String(b.table_number), 10);
      if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
      return String(a.table_number).localeCompare(String(b.table_number));
    });

    const results = [];
    for (const order of occupiedOrders) {
      const waiterName = await resolveWaiterName(order);

      results.push({
        table_number: order.table_number,
        order_id: order.id,
        status: order.status,
        waiter_name: waiterName,
      });
    }

    return {
      data: { status: "success", data: results },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  getUnprinted: async (config?: any) => {
    const unprinted = (await readRows(localDbTables.orders))
      .filter((item: any) => shouldAutoPrintOrder(item))
      .sort((a: any, b: any) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return ta - tb;
      });
    return {
      data: {
        status: "success",
        data: { orders: unprinted },
        orders: unprinted,
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any;
  },

  getReceiptImages: async (id: string) => {
    // Receipt images are not available in offline mode
    return {
      data: { status: "success", data: [] },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  getTicketPayload: async (id: string) => {
    const order = await findOrder(id);
    if (order) {
      const waiterName = await resolveWaiterName(order);
      const payloadBase64 = generateEscPosBase64(order, waiterName);
      return buildResponse({ payload: payloadBase64 });
    }
    return buildErrorResponse("Ticket payload not found locally");
  },

  markPrinted: async (id: string) => {
    let order = await findOrder(id);

    if (order) {
      const updated = {
        ...order,
        is_printed: 1,
        meta: {
          ...(order.meta && typeof order.meta === "object" ? order.meta : {}),
          is_printed: 1,
        },
        updated_at: getApproximateServerIsoString(),
      };
      await upsertOrder(updated);
    }

    return {
      data: { status: "success" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  printOrderNative: async (id: string, printerName?: string) => {
    const order = await findOrder(id);
    if (!order) {
      throw new Error("Order not found locally");
    }

    const waiterName = await resolveWaiterName(order);
    const { print_thermal_printer } =
      await import("tauri-plugin-thermal-printer");
    const availablePrinters = await listAvailablePrinters();
    const targetPrinter = resolvePrinter(printerName, availablePrinters);

    // Department routing is the primary path. Simple printing mode is only a
    // FALLBACK: when a department (or station) has no printer assigned, or its
    // assigned printer isn't present on this device, we fall back to the single
    // active printer — but only if simple mode is turned on. If simple mode is
    // off and there's no usable routed printer, that ticket is not printed.
    const simplePrintMode = getSimplePrintMode();
    const simplePrinter = simplePrintMode
      ? resolvePrinter(printerName || getActivePrinterName(), availablePrinters)
      : "";
    const showPricesOnTicket = getTicketShowPrices();

    // Pick the printer for one ticket. Prefer the configured printer when it
    // actually exists on this device (routing "on"); otherwise fall back to the
    // simple/active printer when simple mode allows it; otherwise null → skip.
    // `viaFallback` tells callers the ticket printed through simple mode rather
    // than its own route — the price toggle only applies to those tickets.
    const pickPrinter = (
      configured?: string,
    ): { printer: string; viaFallback: boolean } | null => {
      const name = String(configured || "").trim();
      if (name && availablePrinters.includes(name)) {
        return { printer: name, viaFallback: false };
      }
      if (simplePrintMode && simplePrinter) {
        return { printer: simplePrinter, viaFallback: true };
      }
      return null;
    };

    // Group items by main_category (prefer menu.main_category, then item fields)
    const itemsByDept: Record<string, any[]> = {};
    const itemDeptPairs = await Promise.all(
      (order.items || []).map(async (item: any) => ({
        item,
        dept: await resolveItemCategory(item),
      })),
    );
    for (const { item, dept } of itemDeptPairs) {
      if (!itemsByDept[dept]) itemsByDept[dept] = [];
      itemsByDept[dept].push(item);
    }

    const departments = Object.keys(itemsByDept);
    if (departments.length === 0) return true;

    const jobsByPrinter: Record<string, any> = {};

    const printedAtDate = order.created_at
      ? new Date(order.created_at)
      : getApproximateServerDate();
    const orderNote = String(order.notes || "").trim();

    // Build one department/station ticket. `headerLabel` is the bold line under
    // the title (e.g. "DEPT: BUTCHERY", "BUTCHER", "CUSTOMER COPY"). When
    // `showPrices` is set the ticket carries per-line subtotals and a total —
    // used for the customer's copy; prep tickets (butcher/kitchen) stay
    // price-free so the line cooks don't get distracted by money.
    const buildTicketBlocks = (
      deptItems: any[],
      headerLabel: string,
      showPrices: boolean,
    ): ReceiptBlock[] => {
      const colWidths = showPrices ? [6, 26, 16] : ORDER_TICKET_COLUMN_WIDTHS;
      const colAligns: ("left" | "right" | "center")[] = showPrices
        ? ["center", "left", "right"]
        : ORDER_TICKET_COLUMN_ALIGNS;

      const blocks: ReceiptBlock[] = [
        { kind: "title", text: "Syntax services" },
        {
          kind: "text",
          text: headerLabel,
          align: "center",
          bold: true,
        },
        {
          kind: "text",
          text: `Order: ${formatOrderNumber(order)}`,
          align: "center",
          bold: true,
          large: true,
        },
        { kind: "divider" },
        order.table_number
          ? {
              kind: "text",
              text: `Table: #${order.table_number}`,
              align: "center",
              bold: true,
            }
          : {
              kind: "text",
              text: "Type: Take Away",
              align: "center",
              bold: true,
            },
        {
          kind: "text",
          text: `Waiter: ${waiterName}`,
          align: "center",
          bold: true,
        },
        {
          kind: "text",
          text: `Date: ${printedAtDate.toLocaleString()}`,
          align: "center",
          bold: true,
        },
        { kind: "divider" },
        {
          kind: "row",
          widths: colWidths,
          align: colAligns,
          bold: true,
          cells: showPrices ? ["Qty", "Item", "Subtotal"] : ["Qty", "Item"],
        },
        // Each item: a row, followed by its own note (if any) on the next
        // line(s). Per-item notes ride with their item, so they only print on
        // the ticket that actually makes that item.
        ...deptItems.flatMap((item: any): ReceiptBlock[] => {
          const name = String(item.menu_item_name || "Item");
          const itemBlocks: ReceiptBlock[] = [
            {
              kind: "row",
              widths: colWidths,
              align: colAligns,
              bold: true,
              cells: showPrices
                ? [
                    `X ${String(item.quantity)}`,
                    name,
                    (parseFloat(item.subtotal) || 0).toFixed(2),
                  ]
                : [`X ${String(item.quantity)}`, name],
            },
          ];
          const itemNote = String(item.note || item.notes || "").trim();
          if (itemNote) {
            for (const line of wrapTicketText(`- ${itemNote}`)) {
              itemBlocks.push({ kind: "text", text: line, align: "center" });
            }
          }
          return itemBlocks;
        }),
      ];

      if (showPrices) {
        const deptTotal = deptItems.reduce(
          (sum, item) => sum + (parseFloat(item.subtotal) || 0),
          0,
        );
        blocks.push(
          { kind: "divider" },
          {
            kind: "text",
            text: `TOTAL: ${deptTotal.toFixed(2)}`,
            align: "center",
            bold: true,
            large: true,
          },
        );
      }

      if (orderNote) {
        blocks.push(
          { kind: "divider" },
          { kind: "text", text: "NOTE", align: "center", bold: true },
          ...wrapTicketText(orderNote).map(
            (line): ReceiptBlock => ({
              kind: "text",
              text: line,
              align: "center",
              bold: true,
            }),
          ),
        );
      }

      return blocks;
    };

    // Render `blocks` and queue it onto `printerName`'s job `copies` times.
    // Tickets bound for the same printer are concatenated into one job (each
    // with its own cut) so a printer fires once per order.
    const queueTicket = async (
      blocks: ReceiptBlock[],
      printerName: string,
      copies: number,
    ) => {
      const deptPrinter =
        resolvePrinter(printerName, availablePrinters) || targetPrinter;
      const imageData = await renderReceiptImage(blocks);
      const printerKey = String(deptPrinter || "").trim();
      for (let copy = 0; copy < Math.max(1, copies); copy += 1) {
        if (!jobsByPrinter[printerKey]) {
          jobsByPrinter[printerKey] = createPrintJob(imageData, deptPrinter);
        } else {
          jobsByPrinter[printerKey].sections.push(
            {
              Image: {
                data: imageData,
                max_width: 0,
                align: "center",
                dithering: false,
                size: "normal",
              },
            },
            { Feed: { feed_type: "lines", value: 3 } },
            { Cut: { mode: "partial", feed: 0 } },
          );
        }
      }
    };

    const skippedDepartments: string[] = [];

    for (const dept of departments) {
      const deptItems = itemsByDept[dept];
      // Department routing is primary; simple mode only fills in when a route is
      // missing or points at a printer that isn't on this device.
      const stations = getDepartmentStations(dept);

      if (stations.length > 0) {
        // Advanced routing (e.g. butchery): fan the same items out to each
        // station's printer with that station's label, copies and price flag.
        for (const station of stations) {
          const pick = pickPrinter(station.printer);
          if (!pick) {
            skippedDepartments.push(`${dept} (${station.label || "station"})`);
            continue;
          }
          const headerLabel = station.label || `DEPT: ${dept.toUpperCase()}`;
          // A station keeps its own price flag when it prints on its own route.
          // If it fell back to simple printing, the simple-print price toggle
          // takes over.
          const showPrices = pick.viaFallback
            ? showPricesOnTicket
            : station.showPrices;
          const blocks = buildTicketBlocks(deptItems, headerLabel, showPrices);
          await queueTicket(blocks, pick.printer, station.copies);
        }
      } else {
        // Default: a single prep ticket to the department's printer, or the
        // active printer via the simple-mode fallback. This branch has no
        // per-station copies, so the global "number of copies" setting is the
        // sole copy control here. Department-routed tickets stay price-free;
        // only simple-print fallback tickets follow the price toggle.
        const pick = pickPrinter(getPrinterForDepartment(dept));
        if (!pick) {
          skippedDepartments.push(dept);
          continue;
        }
        const showPrices = pick.viaFallback ? showPricesOnTicket : false;
        const blocks = buildTicketBlocks(
          deptItems,
          `DEPT: ${dept.toUpperCase()}`,
          showPrices,
        );
        await queueTicket(blocks, pick.printer, getPrintCopies());
      }
    }

    // Nothing could be routed and simple-mode fallback wasn't available/allowed.
    // Surface it to the caller so the print-failure banner shows, rather than
    // silently reporting success for an order that never printed.
    if (Object.keys(jobsByPrinter).length === 0) {
      throw new Error(
        simplePrintMode
          ? "No printer is available to print the order ticket. Check that a printer is connected."
          : "No printer is configured for this order's departments. Assign printers in Printer Settings, or turn on Simple printing mode to use the active printer.",
      );
    }

    if (skippedDepartments.length > 0) {
      console.warn(
        `[print] Some tickets were not printed (no routed printer, simple fallback ${simplePrintMode ? "unavailable" : "off"}): ${skippedDepartments.join(", ")}`,
      );
    }

    const printJobs = Object.values(jobsByPrinter).map((job: any) =>
      print_thermal_printer(job as any),
    );

    await Promise.allSettled(printJobs);

    return true;
  },

  testPrintNative: async (printerName?: string) => {
    const { print_thermal_printer } =
      await import("tauri-plugin-thermal-printer");
    const targetPrinter = await selectPrinter(printerName);

    const colWidths = DEFAULT_TABLE_COLUMN_WIDTHS;
    const colAligns = DEFAULT_TABLE_COLUMN_ALIGNS;

    // Rendered as an image so the test confirms Amharic / Ge'ez prints correctly.
    const blocks: ReceiptBlock[] = [
      { kind: "title", text: "DIAGNOSTIC TEST" },
      {
        kind: "text",
        text: "TAURI NATIVE THERMAL PRINTER TEST",
        align: "center",
      },
      { kind: "text", text: "የአማርኛ ህትመት ሙከራ", align: "center", bold: true },
      { kind: "divider" },
      { kind: "text", text: "Table: #5 (MOCK)" },
      { kind: "text", text: "Waiter: Diagnostics Bot" },
      { kind: "text", text: `Date: ${getApproximateServerDate()}` },
      { kind: "divider" },
      {
        kind: "row",
        widths: colWidths,
        align: colAligns,
        bold: true,
        cells: ["Item", "Qty", "Price", "Sub"],
      },
      {
        kind: "row",
        widths: colWidths,
        align: colAligns,
        cells: ["ማኪያቶ", "2", "45", "90"],
      },
      {
        kind: "row",
        widths: colWidths,
        align: colAligns,
        cells: ["ቡና", "1", "60", "60"],
      },
      { kind: "divider" },
      { kind: "text", text: "TOTAL: 150.00 Birr", bold: true, large: true },
      { kind: "gap", height: 8 },
      { kind: "text", text: "Connection Successful!", align: "center" },
    ];

    const imageData = await renderReceiptImage(blocks);
    const job = createPrintJob(imageData, targetPrinter);
    await print_thermal_printer(job as any);
    return true;
  },

  getZReport: async (params?: any) => {
    if (isOnline()) {
      return api.get("/orders/z-report", { params });
    }
    throw new Error("Z-report requires online connection to backend");
  },
};

export const ordersAdapter = ordersAdapterImpl;
