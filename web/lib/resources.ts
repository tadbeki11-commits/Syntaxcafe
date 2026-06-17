import { apiFetch } from "./api";

// Centralized resource calls. The backend wraps lists as
// { status, data: { <key>, count } }; these unwrap to the inner payload.
const j = (body: any) => ({ method: "POST", body: JSON.stringify(body) });
const put = (body: any) => ({ method: "PUT", body: JSON.stringify(body) });
const patch = (body: any) => ({ method: "PATCH", body: JSON.stringify(body) });
const del = { method: "DELETE" };

export const Menu = {
  items: () => apiFetch("/menu").then((d) => d.data.menuItems ?? []),
  // Categories shown/managed here are "main categories" — the same table the
  // create call writes to, and the source for a menu item's `main_category`.
  categories: () =>
    apiFetch("/menu/main-categories").then((d) => d.data.mainCategories ?? []),
  create: (b: any) => apiFetch("/menu", j(b)),
  // Bulk create/update. The backend upserts each item and emits sync events,
  // scoped to the branch from the X-Branch-Id header.
  bulkSync: (menuItems: any[]) => apiFetch("/menu/sync", j({ menuItems })),
  update: (id: string, b: any) => apiFetch(`/menu/${id}`, put(b)),
  remove: (id: string) => apiFetch(`/menu/${id}`, del),
  toggle: (id: string) => apiFetch(`/menu/${id}/toggle-availability`, { method: "POST" }),
  createCategory: (b: any) => apiFetch("/menu/main-categories", j(b)),
};

export const Inventory = {
  list: () => apiFetch("/inventory?limit=200").then((d) => d.data.items ?? []),
  create: (b: any) => apiFetch("/inventory", j(b)),
  remove: (id: string) => apiFetch(`/inventory/${id}`, del),
  setQuantity: (id: string, b: any) => apiFetch(`/inventory/${id}/quantity`, put(b)),
  transfers: () => apiFetch("/inventory/transfers").then((d) => d.data.transfers ?? []),
  createTransfer: (b: any) => apiFetch("/inventory/transfers", j(b)),
};

export const StockLocations = {
  list: () => apiFetch("/stock-locations").then((d) => d.data.locations ?? []),
  create: (b: any) => apiFetch("/stock-locations", j(b)),
  remove: (id: string) => apiFetch(`/stock-locations/${id}`, del),
};

export const Tables = {
  list: () => apiFetch("/tables").then((d) => d.data.tables ?? []),
  create: (b: any) => apiFetch("/tables", j(b)),
  update: (id: string, b: any) => apiFetch(`/tables/${id}`, put(b)),
  remove: (id: string) => apiFetch(`/tables/${id}`, del),
};

export const Users = {
  list: () => apiFetch("/users").then((d) => d.data.users ?? d.data ?? []),
  create: (b: any) => apiFetch("/users", j(b)),
  update: (id: string, b: any) => apiFetch(`/users/${id}`, put(b)),
  toggle: (id: string) => apiFetch(`/users/${id}/toggle-status`, patch({})),
};

export const Recipes = {
  // The backend returns a single recipe (with ingredients) per menu item, or null.
  forMenuItem: (menuItemId: string) =>
    apiFetch(`/recipes/menu-item/${menuItemId}`).then((d) => d.data.recipe),
  create: (b: any) => apiFetch("/recipes", j(b)),
  update: (id: string, b: any) => apiFetch(`/recipes/${id}`, put(b)),
  remove: (id: string) => apiFetch(`/recipes/${id}`, del),
};

export const Organizations = {
  list: () => apiFetch("/organizations").then((d) => d.data.organizations ?? []),
  get: (id: string) =>
    apiFetch(`/organizations/${id}`).then((d) => d.data.organization),
  create: (b: any) => apiFetch("/organizations", j(b)),
  update: (id: string, b: any) => apiFetch(`/organizations/${id}`, put(b)),
  remove: (id: string) => apiFetch(`/organizations/${id}`, del), // deactivate
  orders: (id: string) =>
    apiFetch(`/organizations/${id}/orders`).then((d) => d.data.orders ?? []),
  credit: (id: string) =>
    apiFetch(`/organizations/${id}/credit`).then((d) => d.data),
  payments: (id: string) =>
    apiFetch(`/organizations/${id}/payments`).then((d) => d.data.payments ?? []),
  addPayment: (id: string, b: any) =>
    apiFetch(`/organizations/${id}/payments`, j(b)),
  transactions: (id: string, params?: Record<string, any>) =>
    apiFetch(`/organizations/${id}/transactions${qs(params)}`).then((d) => d.data),
  addTransaction: (id: string, b: any) =>
    apiFetch(`/organizations/${id}/transactions`, j(b)),
};

const qs = (params?: Record<string, any>) => {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
};

export const Orders = {
  list: (params?: Record<string, any>) =>
    apiFetch(`/orders${qs(params)}`).then((d) => d.data.orders ?? []),
  get: (id: string) => apiFetch(`/orders/${id}`).then((d) => d.data.order),
  forPayment: () =>
    apiFetch("/orders/for-payment").then((d) => d.data.orders ?? []),
  create: (b: any) => apiFetch("/orders", j(b)),
  zReport: (params: { start_date?: string; end_date?: string }) =>
    apiFetch(`/orders/z-report${qs(params)}`).then((d) => d.data.zReport),
};

export const Payments = {
  history: () => apiFetch("/payments/history").then((d) => d.data.payments ?? []),
  get: (id: string) => apiFetch(`/payments/${id}`).then((d) => d.data.payment),
  create: (b: any) => apiFetch("/payments", j(b)).then((d) => d.data.payment),
  confirm: (id: string, processed_by?: string) =>
    apiFetch(`/payments/${id}/confirm`, j({ processed_by })),
};

export const Expenses = {
  list: (params?: Record<string, any>) =>
    apiFetch(`/expenses${qs(params)}`).then((d) => d.data.expenses ?? []),
  summary: (params?: Record<string, any>) =>
    apiFetch(`/expenses/summary${qs(params)}`).then((d) => d.data),
  create: (b: any) => apiFetch("/expenses", j(b)),
  update: (id: string, b: any) => apiFetch(`/expenses/${id}`, put(b)),
  remove: (id: string) => apiFetch(`/expenses/${id}`, del),
};

export const Settings = {
  paymentMethods: () =>
    apiFetch("/settings/payment-methods").then((d) => d.data.payment_methods ?? []),
  createPaymentMethod: (b: any) => apiFetch("/settings/payment-methods", j(b)),
  updatePaymentMethod: (id: string, b: any) =>
    apiFetch(`/settings/payment-methods/${id}`, put(b)),
  removePaymentMethod: (id: string) =>
    apiFetch(`/settings/payment-methods/${id}`, del),
  roles: () => apiFetch("/settings/roles").then((d) => d.data.roles ?? []),
  createRole: (b: any) => apiFetch("/settings/roles", j(b)),
  removeRole: (id: string) => apiFetch(`/settings/roles/${id}`, del),

  // Per-branch POS behavior rules. All of these are scoped to the branch the
  // owner has selected (sent as x-branch-id by apiFetch).
  tableSelection: () =>
    apiFetch("/settings/system/table-selection").then((d) => d.data),
  updateTableSelection: (b: { force_table_selection: boolean }) =>
    apiFetch("/settings/system/table-selection", put(b)).then((d) => d.data),
  inventory: () => apiFetch("/settings/system/inventory").then((d) => d.data),
  updateInventory: (b: { allow_low_stock_orders: boolean }) =>
    apiFetch("/settings/system/inventory", put(b)).then((d) => d.data),
  organizations: () =>
    apiFetch("/settings/system/organizations").then((d) => d.data),
  updateOrganizations: (b: { allow_cashier_manage_org_orders: boolean }) =>
    apiFetch("/settings/system/organizations", put(b)).then((d) => d.data),
  receipt: () => apiFetch("/settings/system/receipt").then((d) => d.data),
  updateReceipt: (b: { enable_cashier_receipt: boolean }) =>
    apiFetch("/settings/system/receipt", put(b)).then((d) => d.data),
  // Cancel-order override password. The backend never returns the hash, only
  // whether one is set.
  cancelPassword: () =>
    apiFetch("/settings/system/cancel-password").then((d) => d.data),
  updateCancelPassword: (cancel_password: string) =>
    apiFetch("/settings/system/cancel-password", put({ cancel_password })).then(
      (d) => d.data,
    ),
};

export const Account = {
  // Update the signed-in user's profile. The backend splits full_name into
  // first/last and returns the refreshed user under `user`.
  updateProfile: (userId: string, b: { full_name: string; username: string }) =>
    apiFetch(`/auth/profile/${userId}`, put(b)).then((d) => d.user),
  changePassword: (userId: string, current_password: string, new_password: string) =>
    apiFetch(`/users/${userId}/change-password`, j({ current_password, new_password })),
};

export const Devices = {
  // The devices enrolled to a branch, with an online flag.
  list: (branch_id: string) =>
    apiFetch(`/devices?branch_id=${encodeURIComponent(branch_id)}`),
  // Reusable per-branch enrollment code: view the current one, or rotate it.
  getEnrollmentCode: (branch_id: string) =>
    apiFetch(`/devices/enrollment-codes?branch_id=${encodeURIComponent(branch_id)}`),
  rotateEnrollmentCode: (branch_id: string) =>
    apiFetch("/devices/enrollment-codes", j({ branch_id })),
};
