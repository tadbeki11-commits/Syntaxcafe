/* eslint-disable @typescript-eslint/no-explicit-any */
// Online-only API client for the cashier portal. Like the desktop POS it carries
// no back-office JWT — every request is scoped to the branch by the enrolled
// device's x-device-token header, plus the X-App-Client marker.

import { API_BASE } from "@/lib/api";
import { getDeviceToken } from "@/lib/cashier/device";

export interface ApiResult<T = any> {
  data: T;
}

async function request<T = any>(
  method: string,
  path: string,
  opts: { body?: any; params?: Record<string, any> } = {},
): Promise<ApiResult<T>> {
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
    return Promise.reject({
      message,
      response: { status: res.status, data: payload },
    });
  }

  const data = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  return { data };
}

const cashierApi = {
  get: <T = any>(path: string, params?: Record<string, any>) =>
    request<T>("GET", path, { params }),
  post: <T = any>(path: string, body?: any) =>
    request<T>("POST", path, { body }),
  put: <T = any>(path: string, body?: any) => request<T>("PUT", path, { body }),
};

export const cashierServices = {
  users: {
    // Public (no-auth) list of cashiers for the enrolled branch's business,
    // scoped server-side by x-device-token.
    getCashiers: () =>
      cashierApi.get("/users/public", { role: "cashier", is_active: "true" }),
    // Waiters of the enrolled branch — the employees whose orders/payments the
    // cashier oversees on the employees page.
    getWaiters: () =>
      cashierApi.get("/users/public", {
        role: "cafe_waiter",
        is_active: "true",
      }),
  },
  menu: {
    getMainCategories: () =>
      cashierApi.get("/menu/main-categories", { is_active: "true" }),
  },
  orders: {
    // Active orders awaiting payment, with per-department dues. `departments`
    // narrows the queue to a department-attached cashier's share; `employeeId`
    // narrows it to one waiter (used by the employees page).
    getCashierQueue: (departments?: string[], employeeId?: string) =>
      cashierApi.get("/orders/cashier-queue", {
        departments: (departments ?? []).join(","),
        employee_id: employeeId || "",
      }),
    getById: (id: string) => cashierApi.get(`/orders/${id}`),
    // All orders (optionally filtered by employee/type) — feeds the employees
    // page timeline + per-employee stats.
    getAll: (params?: Record<string, any>) => cashierApi.get("/orders", params),
    // Orders ready for payment, optionally scoped to one waiter.
    getOrdersForPayment: (params?: Record<string, any>) =>
      cashierApi.get("/orders/for-payment", params),
    // Cancel a whole order (whole-order flow / employees page).
    updateStatus: (id: string, statusData: any) =>
      cashierApi.put(`/orders/${id}/status`, statusData),
  },
  payments: {
    // Department-share settle (attached cashier).
    settleDepartment: (body: {
      order_id: string;
      department: string;
      payment_method?: string;
      processed_by?: string;
    }) => cashierApi.post("/payments/settle-department", body),
    // Whole-order flow (unattached cashier) — same two calls the desktop uses.
    create: (body: any) => cashierApi.post("/payments", body),
    confirm: (id: string, body: any) =>
      cashierApi.post(`/payments/${id}/confirm`, body),
    // Processed-payment ledger, date-windowed, for the recent-payments panel.
    history: (params?: Record<string, any>) =>
      cashierApi.get("/payments/history", params),
  },
  settings: {
    // Whether this branch requires a password to cancel an order.
    getCancelPasswordStatus: () =>
      cashierApi.get("/settings/system/cancel-password"),
    // Validate a typed cancel password against the branch's stored hash.
    verifyCancelPassword: (cancel_password: string) =>
      cashierApi.post("/settings/system/cancel-password/verify", {
        cancel_password,
      }),
  },
  account: {
    // Update the signed-in cashier's name. Mirrors the desktop POS /
    // waiter portal: the backend splits full_name into first/last.
    updateProfile: (
      userId: string,
      body: { full_name: string; username?: string },
    ) => cashierApi.put(`/auth/profile/${userId}`, body),
    changePassword: (
      userId: string,
      current_password: string,
      new_password: string,
    ) =>
      cashierApi.post(`/users/${userId}/change-password`, {
        current_password,
        new_password,
      }),
  },
};

export default cashierApi;
