import { api, isOnline } from "@/infrastructure/api/http-client";

const asNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeItem = (item: any) => {
  const stockByLocation: any[] = Array.isArray(item?.stock_by_location)
    ? item.stock_by_location
    : [];

  // Compute legacy flat quantities from stock_by_location for display compat
  const mainStoreEntry = stockByLocation.find(
    (s: any) =>
      s.location_name?.toLowerCase().includes("store") ||
      s.location_name?.toLowerCase().includes("main"),
  );
  const baristaEntry = stockByLocation.find((s: any) =>
    s.location_name?.toLowerCase().includes("barista"),
  );

  const storeQty = asNumber(
    mainStoreEntry?.quantity ?? item?.store_quantity ?? item?.quantity,
  );
  const baristaQty = asNumber(baristaEntry?.quantity ?? item?.barista_quantity);

  return {
    ...item,
    id: item?.id,
    name: item?.name ?? "",
    unit: item?.unit ?? "piece",
    base_unit: item?.base_unit ?? "piece",
    pieces_per_unit: Math.max(1, asNumber(item?.pieces_per_unit, 1)),
    // Preferred shape
    stock_by_location: stockByLocation,
    // Legacy flat quantities for backward compat display
    quantity: storeQty,
    store_quantity: storeQty,
    barista_quantity: baristaQty,
    min_quantity: asNumber(item?.min_quantity),
    notes: item?.notes ?? "",
    synced: 1 as 0 | 1,
  };
};

const normalizeTransfer = (transfer: any) => ({
  ...transfer,
  id: transfer?.id,
  from_location_id: transfer?.from_location_id ?? null,
  to_location_id: transfer?.to_location_id ?? null,
  from_location_name:
    transfer?.from_location_name ?? transfer?.from_location ?? "",
  to_location_name: transfer?.to_location_name ?? transfer?.to_location ?? "",
  // legacy compat
  from_location: transfer?.from_location ?? "",
  to_location: transfer?.to_location ?? "",
  status: transfer?.status ?? "sent",
  items: Array.isArray(transfer?.items) ? transfer.items : [],
  synced: 1 as 0 | 1,
});

const successResponse = (data: any) =>
  ({
    data: { status: "success", data },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as any,
  }) as any;

const requireOnline = () =>
  isOnline()
    ? null
    : Promise.reject(
      new Error("Inventory management requires an internet connection"),
    );

// Stock locations keep their own local mirror (a separate, in-scope domain), so
// form inputs may carry a local PK. Translate it to the backend id the inventory
// API expects.
const resolveRemoteLocationId = async (
  locationId: string | null | undefined,
): Promise<string | null> => {
  if (locationId == null) return null;
  return String(locationId);
};

let getAllLock: Promise<any> | null = null;

const inventoryAdapterImpl = {
  getAll: async (page: number = 1, limit: number = 50, search?: string) => {
    if (getAllLock) return getAllLock;

    const doGetAll = async () => {
      // Backend is the single source of truth — read straight from the API and
      // hand normalized items to the UI. Nothing is mirrored locally.
      const response = await api.get("/inventory", {
        params: { page, limit, search }
      });
      const data = response?.data?.data ?? response?.data ?? {};
      const items = data.items ?? [];
      const normalized = (Array.isArray(items) ? items : []).map(normalizeItem);
      return successResponse({
        items: normalized,
        count: data.count ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 50,
        totalPages: data.totalPages ?? 1,
      });
    };

    getAllLock = doGetAll().finally(() => {
      getAllLock = null;
    });
    return getAllLock;
  },

  getTransfers: async () => {
    const response = await api.get("/inventory/transfers");
    const transfers =
      response?.data?.data?.transfers ?? response?.data?.transfers ?? [];
    const normalized = (Array.isArray(transfers) ? transfers : []).map(
      normalizeTransfer,
    );
    return successResponse({ transfers: normalized });
  },

  getMovements: async (id: number | string, locationId?: number | string) => {
    const remoteLocationId =
      locationId != null ? await resolveRemoteLocationId(String(locationId)) : null;
    const response = await api.get(`/inventory/${id}/movements`, {
      params: remoteLocationId != null ? { locationId: String(remoteLocationId) } : undefined,
    });
    const movements =
      response?.data?.data?.movements ?? response?.data?.movements ?? [];
    return successResponse({
      movements: Array.isArray(movements) ? movements : [],
    });
  },

  create: async (data: any) => {
    const offline = requireOnline();
    if (offline) return offline;

    const payload = { ...data };
    if (Array.isArray(payload.stock_by_location)) {
      payload.stock_by_location = await Promise.all(
        payload.stock_by_location.map(async (stock: any) => ({
          ...stock,
          location_id:
            stock.location_id != null
              ? await resolveRemoteLocationId(stock.location_id)
              : null,
        })),
      );
    }

    return api.post("/inventory", payload);
  },

  update: async (id: number | string, data: any) => {
    const offline = requireOnline();
    if (offline) return offline;

    return api.put(`/inventory/${id}`, data);
  },

  delete: async (id: number | string) => {
    const offline = requireOnline();
    if (offline) return offline;

    if (!id) return successResponse({});
    return api.delete(`/inventory/${id}`);
  },

  updateQuantity: async (id: number | string, data: any) => {
    const offline = requireOnline();
    if (offline) return offline;

    const payload = { ...data };
    if (payload.location_id != null) {
      payload.location_id = await resolveRemoteLocationId(payload.location_id);
    }

    return api.put(`/inventory/${id}/quantity`, payload);
  },

  createTransfer: async (data: any) => {
    const offline = requireOnline();
    if (offline) return offline;

    const payload = { ...data };
    if (payload.to_location_id != null) {
      payload.to_location_id = await resolveRemoteLocationId(
        payload.to_location_id,
      );
    }
    if (payload.from_location_id != null) {
      payload.from_location_id = await resolveRemoteLocationId(
        payload.from_location_id,
      );
    }

    return api.post("/inventory/transfers", payload);
  },

  receiveTransfer: async (id: number | string) => {
    const offline = requireOnline();
    if (offline) return offline;

    return api.post(`/inventory/transfers/${id}/receive`, {});
  },
};

export const inventoryAdapter = inventoryAdapterImpl;
