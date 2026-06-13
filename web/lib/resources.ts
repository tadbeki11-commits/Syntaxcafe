import { apiFetch } from "./api";

// Centralized resource calls. The backend wraps lists as
// { status, data: { <key>, count } }; these unwrap to the inner payload.
const j = (body: any) => ({ method: "POST", body: JSON.stringify(body) });
const put = (body: any) => ({ method: "PUT", body: JSON.stringify(body) });
const patch = (body: any) => ({ method: "PATCH", body: JSON.stringify(body) });
const del = { method: "DELETE" };

export const Menu = {
  items: () => apiFetch("/menu").then((d) => d.data.menuItems ?? []),
  categories: () => apiFetch("/menu/categories").then((d) => d.data.categories ?? []),
  create: (b: any) => apiFetch("/menu", j(b)),
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

export const Organizations = {
  list: () => apiFetch("/organizations").then((d) => d.data.organizations ?? []),
  create: (b: any) => apiFetch("/organizations", j(b)),
  remove: (id: string) => apiFetch(`/organizations/${id}`, del),
};

export const Orders = {
  list: () => apiFetch("/orders").then((d) => d.data.orders ?? []),
};

export const Payments = {
  history: () => apiFetch("/payments/history").then((d) => d.data.payments ?? []),
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
};

export const Devices = {
  createEnrollmentCode: (branch_id: string, name?: string) =>
    apiFetch("/devices/enrollment-codes", j({ branch_id, name })),
};
