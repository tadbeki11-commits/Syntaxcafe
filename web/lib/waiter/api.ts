/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// Online-only API client for the waiter portal. Where the desktop app reads from
// a local SQLite mirror and syncs in the background, the web waiter talks
// straight to the NestJS backend. Every request carries:
//   - Authorization: the waiter's JWT (from the wp_token cookie)
//   - x-device-token: the device's branch token (from localStorage) so the
//     backend pins the order to the enrolled branch
//   - X-App-Client: the marker several routes gate on
//
// Calls return an axios-shaped `{ data }` envelope so the ported hooks can keep
// their defensive response-extraction logic unchanged.

import { API_BASE } from "@/lib/api";
import { getWaiterToken } from "@/lib/waiter/auth";
import { getDeviceToken } from "@/lib/waiter/device";

export interface ApiResult<T = any> {
  data: T;
}

async function request<T = any>(
  method: string,
  path: string,
  opts: { body?: any; params?: Record<string, any> } = {},
): Promise<ApiResult<T>> {
  const token = getWaiterToken();
  const deviceToken = getDeviceToken();

  let url = `${API_BASE}${path}`;
  if (opts.params) {
    const qs = new URLSearchParams();
    Object.entries(opts.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Client": "tauri-pos-app",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(deviceToken ? { "x-device-token": deviceToken } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let payload: any = null;
    try {
      payload = await res.json();
      message = payload?.message || message;
      if (Array.isArray(message)) message = message.join(", ");
    } catch {
      /* non-JSON error body */
    }
    // Shape the rejection like an axios error so callers can read err.response.
    return Promise.reject({
      message,
      response: { status: res.status, data: payload },
    });
  }

  const data = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  return { data };
}

const waiterApi = {
  get: <T = any>(path: string, params?: Record<string, any>) =>
    request<T>("GET", path, { params }),
  post: <T = any>(path: string, body?: any) =>
    request<T>("POST", path, { body }),
  put: <T = any>(path: string, body?: any) => request<T>("PUT", path, { body }),
};

/**
 * Subset of the desktop `appServices` facade used by the waiter screens, backed
 * by direct REST calls. Attendance has no backend module yet, so those methods
 * degrade gracefully (see notes below).
 */
export const waiterServices = {
  menu: {
    getCafeMenu: () => waiterApi.get("/menu/cafe"),
    getAll: (params?: Record<string, any>) => waiterApi.get("/menu", params),
  },
  tables: {
    getAll: () => waiterApi.get("/tables"),
  },
  users: {
    // Public (no-auth) list of café waiters for the enrolled branch's business.
    // Scoped server-side by the x-device-token header.
    getWaiters: () =>
      waiterApi.get("/users/public", { role: "cafe_waiter", is_active: "true" }),
  },
  account: {
    // Update the signed-in waiter's name/username. Mirrors the desktop POS:
    // the backend splits full_name into first/last and returns the refreshed
    // user under `user`.
    updateProfile: (
      userId: string,
      body: { full_name: string; username: string },
    ) => waiterApi.put(`/auth/profile/${userId}`, body),
    // Change the waiter's 4-digit login PIN. PINs live in their own pin_hash
    // column (see backend users.service), so this hits the dedicated endpoint
    // rather than change-password (which only touches password_hash).
    changePin: (userId: string, current_pin: string, new_pin: string) =>
      waiterApi.post(`/users/${userId}/change-pin`, {
        current_pin,
        new_pin,
      }),
  },
  settings: {
    getTableSelectionSettings: async (): Promise<{
      force_table_selection: boolean;
    }> => {
      try {
        const res = await waiterApi.get<any>("/settings/system/table-selection");
        const body = res.data ?? {};
        return {
          force_table_selection: Boolean(
            body?.data?.force_table_selection ?? body?.force_table_selection,
          ),
        };
      } catch {
        return { force_table_selection: false };
      }
    },
    // Owner toggle (Order Rules page) that gates whether this waiter screen shows
    // inventory-derived stock hints. Defaults off if the call fails.
    getMenuAvailabilitySettings: async (): Promise<{
      show_menu_inventory_availability: boolean;
    }> => {
      try {
        const res = await waiterApi.get<any>(
          "/settings/system/menu-availability",
        );
        const body = res.data ?? {};
        return {
          show_menu_inventory_availability: Boolean(
            body?.data?.show_menu_inventory_availability ??
              body?.show_menu_inventory_availability,
          ),
        };
      } catch {
        return { show_menu_inventory_availability: false };
      }
    },
  },
  inventory: {
    // Per-menu-item availability derived from recipes + current stock. Only items
    // with an active recipe are returned; everything else is untracked (treated
    // as available). Returns [] on failure so the menu still renders.
    getMenuAvailability: async (): Promise<
      Array<{
        menu_item_id: string;
        makeable: number;
        status: "out" | "low" | "in_stock";
      }>
    > => {
      try {
        const res = await waiterApi.get<any>("/inventory/menu-availability");
        const body = res.data ?? {};
        const items = body?.data?.items ?? body?.items ?? [];
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
  },
  orders: {
    getAll: (params?: Record<string, any>) => waiterApi.get("/orders", params),
    createCafe: (orderData: any) => waiterApi.post("/orders/cafe", orderData),
    addItems: (id: string | number, itemsData: any) =>
      waiterApi.post(`/orders/${id}/items`, itemsData),
    updateStatus: (id: string | number, statusData: any) =>
      waiterApi.put(`/orders/${id}/status`, statusData),
  },
  // Attendance has no backend endpoint in this deployment. Clock-in/out are
  // surfaced in the UI but resolve to a no-op so the dashboard still renders.
  attendance: {
    getCurrentStatus: async (_userId?: string | number) =>
      ({ data: { data: { currentStatus: null } } }) as ApiResult,
    clockIn: async (_data?: any) =>
      Promise.reject(new Error("Attendance is not available in the web portal")),
    clockOut: async (_data?: any) =>
      Promise.reject(new Error("Attendance is not available in the web portal")),
  },
};

export default waiterApi;
