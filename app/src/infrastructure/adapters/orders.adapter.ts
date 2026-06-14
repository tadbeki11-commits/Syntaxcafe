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
import { getPrinterForDepartment } from "@/infrastructure/printing/printer-config";
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

const DEFAULT_WAITER_NAME = "Waiter";
const DEFAULT_CATEGORY = "cafe";
const DEFAULT_ORDER_STATUS = "pending";
const DEFAULT_PAYMENT_STATUS = "pending";
const DEFAULT_TABLE_COLUMN_WIDTHS = [20, 6, 11, 11];
const DEFAULT_TABLE_COLUMN_ALIGNS: ("left" | "right")[] = ["left", "right", "right", "right"];

const findOrder = async (id: string) => {
  return findByIdOrRemote(localDbTables.orders, id);
};

const findUser = async (id: string) => {
  return findById(localDbTables.users, id);
};

const resolveWaiterName = async (order: any): Promise<string> => {
  const waiterId = order?.waiter_id ?? order?.employee_id ?? order?.created_by_id;
  if (!waiterId) return DEFAULT_WAITER_NAME;
  const waiterUser = await findUser(String(waiterId));
  if (!waiterUser) return DEFAULT_WAITER_NAME;
  return (
    [waiterUser.first_name, waiterUser.last_name].filter(Boolean).join(" ").trim() ||
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
    const menuItem = await findByIdOrRemote(localDbTables.menuItems, menuItemId);
    const menuMain = extractMenuMainCategory(menuItem);
    if (menuMain) return menuMain;
  }

  const explicitMain = String(item?.main_category || "").trim().toLowerCase();
  if (explicitMain) return explicitMain;

  const legacyType = String(item?.item_type || "").trim().toLowerCase();
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

const buildErrorResponse = (message: string, status: number = 404) => ({
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

const selectPrinter = async (printerName?: string): Promise<string> => {
  const { list_thermal_printers } = await import("tauri-plugin-thermal-printer");
  if (printerName) return printerName;
  const printers = (await list_thermal_printers()) as any;
  if (printers && printers.length > 0) {
    const first = printers[0];
    return typeof first === "string" ? first : first.name || first.address || "";
  }
  return "";
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
      (o) => String(o?.employee_id || "") === id || String(o?.waiter_id || "") === id,
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
export const persistServerOrders = async (remoteOrders: any[]) => {
  if (!Array.isArray(remoteOrders) || remoteOrders.length === 0) return 0;
  const localOrders = await readRows(localDbTables.orders);
  let count = 0;
  for (const remote of remoteOrders) {
    if (!remote?.id) continue;
    const cached = localOrders.find((c: any) => c?.id === remote.id);
    // Never clobber a locally-created order that hasn't been pushed yet.
    if (cached && Number(cached.synced ?? 0) === 0) continue;
    await upsertOrder(mapServerOrderToLocal(remote, cached));
    count += 1;
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
  waiter_id: order.waiter_id || '',
  customer_id: order.customer_id,
  table_number: order.table_number || '',
  order_type_label: order.order_type_label || '',
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

const syncUnsyncedOrders = async () => {
  const localOrders = await readRows(localDbTables.orders);
  const unsyncedOrders = localOrders.filter((o: any) => Number(o?.synced ?? 0) === 0);
  if (unsyncedOrders.length === 0) return;

  const BATCH_SIZE = 50;

  for (let i = 0; i < unsyncedOrders.length; i += BATCH_SIZE) {
    const batch = unsyncedOrders.slice(i, i + BATCH_SIZE);
    const orderPayloads = batch.map(normalizeOrderPayload);

    try {
      const resp = await api.post("/orders/sync", { orders: orderPayloads, payments: [] });
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
            console.warn("[Orders Sync] Skipping conflicted order", { orderId: order.id });
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
          payments: []
        });
        // Only mark synced if the backend confirms it actually stored the order;
        // otherwise leave it unsynced so the sync engine retries it later.
        const persisted = extractPersistedOrderIds(resp);
        if (!persisted || persisted.has(String(orderId))) {
          localOrder.synced = 1;
        } else {
          console.warn("[Orders Create] Backend skipped order; keeping it unsynced for retry", orderId);
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
          await upsertOrder({ ...order, status: statusData.status, updated_at: getApproximateServerIsoString(), synced: 1 });
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
    return updateOrderWithChanges(id, { status: "ready" });
  },
  complete: async (id: string, data: any) => {
    return updateOrderWithChanges(id, { status: "completed" });
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
    const readyLocal = localOrders.filter((o) => o.status === "ready");

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
      (o) =>
        o.type === "cafe" && ["pending", "preparing"].includes(o.status || ""),
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
    const activeLocalOrders = scopedOrders.filter(
      (o) =>
        o.status !== "completed" &&
        o.status !== "cancelled" &&
        o.status !== "paid",
    );

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
        ["pending", "preparing", "ready"].includes(o.status || "") &&
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
    const { print_thermal_printer } = await import("tauri-plugin-thermal-printer");
    const targetPrinter = await selectPrinter(printerName);

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

    for (const dept of departments) {
      const deptItems = itemsByDept[dept];
      const deptPrinter = getPrinterForDepartment(dept) || targetPrinter;
      const rows = deptItems.map((item: any) => [
        String(item.menu_item_name || "Item"),
        String(item.quantity),
        parseFloat(String(item.unit_price)).toFixed(0),
        parseFloat(String(item.subtotal)).toFixed(0),
      ]);

      const deptTotal = deptItems.reduce(
        (sum, item) => sum + (parseFloat(item.subtotal) || 0),
        0,
      );

      const printedAtDate = order.created_at
        ? new Date(order.created_at)
        : getApproximateServerDate();

      const colWidths = DEFAULT_TABLE_COLUMN_WIDTHS;
      const colAligns = DEFAULT_TABLE_COLUMN_ALIGNS;

      const blocks: ReceiptBlock[] = [
        { kind: "title", text: "Syntax services" },
        {
          kind: "text",
          text: `DEPT: ${dept.toUpperCase()}`,
          align: "center",
          bold: true,
        },
        { kind: "text", text: "OFFLINE ORDER TICKET", align: "center" },
        { kind: "divider" },
        order.table_number
          ? { kind: "text", text: `Table: #${order.table_number}`, align: "center" }
          : { kind: "text", text: "Type: Take Away", align: "center" },
        { kind: "text", text: `Waiter: ${waiterName}`, align: "center" },
        { kind: "text", text: `Date: ${printedAtDate.toLocaleString()}`, align: "center" },
        { kind: "divider" },
        {
          kind: "row",
          widths: colWidths,
          align: colAligns,
          bold: true,
          cells: ["Item", "Qty", "Price", "Sub"],
        },
        ...rows.map(
          (r: string[]): ReceiptBlock => ({
            kind: "row",
            widths: colWidths,
            align: colAligns,
            cells: r,
          }),
        ),
        { kind: "divider" },
        {
          kind: "text",
          text: `DEPT TOTAL: ${deptTotal.toFixed(2)} Birr`,
          align: "center",
          bold: true,
          large: true,
        },
      ];

      if (departments.length === 1) {
        // If only one dept, show the grand total too
        blocks.push({
          kind: "text",
          text: `ORDER TOTAL: ${parseFloat(String(order.total_amount)).toFixed(2)} Birr`,
          align: "center",
          bold: true,
        });
      }

      blocks.push({ kind: "gap", height: 8 });
      blocks.push({ kind: "text", text: "Thank You!", align: "center" });

      const imageData = await renderReceiptImage(blocks);
      const printerKey = String(deptPrinter || "").trim();
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

    const printJobs = Object.values(jobsByPrinter).map((job: any) =>
      print_thermal_printer(job as any),
    );

    await Promise.allSettled(printJobs);

    return true;
  },

  testPrintNative: async (printerName?: string) => {
    const { print_thermal_printer } = await import("tauri-plugin-thermal-printer");
    const targetPrinter = await selectPrinter(printerName);

    const colWidths = DEFAULT_TABLE_COLUMN_WIDTHS;
    const colAligns = DEFAULT_TABLE_COLUMN_ALIGNS;

    // Rendered as an image so the test confirms Amharic / Ge'ez prints correctly.
    const blocks: ReceiptBlock[] = [
      { kind: "title", text: "DIAGNOSTIC TEST" },
      { kind: "text", text: "TAURI NATIVE THERMAL PRINTER TEST", align: "center" },
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
