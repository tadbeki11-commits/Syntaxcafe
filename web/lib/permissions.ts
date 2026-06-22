// Client-side RBAC: resources, roles, and the cached permission matrix that
// drives the sidebar nav and the route guard. Kept in sync with the backend's
// backend/src/common/permissions/permissions.constants.ts.

import { apiFetch } from "./api";

// Read the signed-in user's role straight from storage to avoid a circular
// import with lib/auth.ts (which calls fetchMyPermissions here on login).
function currentRole(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return JSON.parse(localStorage.getItem("pa_user") || "null")?.role;
  } catch {
    return undefined;
  }
}

export const ACTIONS = ["read", "write", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

export type ResourcePermissions = Record<Action, boolean>;
export type PermissionMatrix = Record<string, ResourcePermissions>;

export type ResourceId =
  | "orders"
  | "payments"
  | "items_sold"
  | "tables"
  | "menu"
  | "inventory"
  | "stock_locations"
  | "transfers"
  | "staff"
  | "customers"
  | "reports"
  | "expenses"
  | "settings"
  | "payment_methods"
  | "roles"
  | "devices";

// Each resource and the dashboard routes it guards. `routes` are matched
// longest-prefix-first so nested pages resolve to the most specific resource.
export const RESOURCES: { id: ResourceId; label: string; routes: string[] }[] = [
  { id: "orders", label: "Orders", routes: ["/dashboard/orders"] },
  { id: "items_sold", label: "Items Sold", routes: ["/dashboard/payments/items"] },
  { id: "payments", label: "Payments", routes: ["/dashboard/payments"] },
  { id: "tables", label: "Tables", routes: ["/dashboard/tables"] },
  { id: "menu", label: "Menu", routes: ["/dashboard/menu"] },
  { id: "stock_locations", label: "Stock Locations", routes: ["/dashboard/inventory/locations"] },
  { id: "transfers", label: "Transfers", routes: ["/dashboard/inventory/transfers"] },
  { id: "inventory", label: "Inventory", routes: ["/dashboard/inventory"] },
  { id: "staff", label: "Staff", routes: ["/dashboard/staff"] },
  { id: "customers", label: "Organizations", routes: ["/dashboard/customers"] },
  { id: "reports", label: "Reports", routes: ["/dashboard/reports"] },
  { id: "expenses", label: "Expenses", routes: ["/dashboard/expenses"] },
  { id: "payment_methods", label: "Payment Methods", routes: ["/dashboard/settings/payment-methods"] },
  { id: "roles", label: "Roles & Permissions", routes: ["/dashboard/settings/roles"] },
  { id: "devices", label: "Devices", routes: ["/dashboard/settings/devices"] },
  { id: "settings", label: "Settings", routes: ["/dashboard/settings"] },
];

export const RESOURCE_IDS = RESOURCES.map((r) => r.id);

// Roles the owner can configure. super_admin / owner / business_admin are
// always full-access and never appear here.
export const CONFIGURABLE_ROLES: { value: string; label: string }[] = [
  { value: "admin", label: "Manager" },
  { value: "fb_manager", label: "F&B Manager" },
  { value: "finance", label: "Finance" },
  { value: "cashier", label: "Cashier" },
  { value: "cafe_waiter", label: "Waiter" },
  { value: "kitchen_staff", label: "Kitchen Staff" },
  { value: "barista", label: "Barista" },
  { value: "host", label: "Host / Receptionist" },
  { value: "storekeeper", label: "Storekeeper" },
  { value: "accountant", label: "Accountant" },
  { value: "housekeeping", label: "Housekeeping" },
];

export const ALL_ACCESS_ROLES = ["super_admin", "owner", "business_admin"];

export function isAllAccessRole(role?: string | null): boolean {
  return !!role && ALL_ACCESS_ROLES.includes(role);
}

function allAllowedMatrix(): PermissionMatrix {
  const m: PermissionMatrix = {};
  for (const r of RESOURCE_IDS) {
    m[r] = { read: true, write: true, update: true, delete: true };
  }
  return m;
}

const STORAGE_KEY = "pa_permissions";

// In-memory cache so `can()` is synchronous for nav/guard renders.
let cached: PermissionMatrix | null = null;

function readCache(): PermissionMatrix {
  if (cached) return cached;
  if (typeof window === "undefined") return allAllowedMatrix();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cached = raw ? (JSON.parse(raw) as PermissionMatrix) : allAllowedMatrix();
  } catch {
    cached = allAllowedMatrix();
  }
  return cached;
}

export function setPermissions(matrix: PermissionMatrix) {
  cached = matrix;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
  }
}

export function clearPermissions() {
  cached = null;
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

// Fetch the signed-in user's effective matrix and cache it. Called after login
// and on dashboard mount so nav/guard reflect the latest config.
export async function fetchMyPermissions(): Promise<PermissionMatrix> {
  try {
    const res = await apiFetch<{ data: { permissions: PermissionMatrix } }>(
      "/role-permissions/me",
    );
    const matrix = res?.data?.permissions ?? allAllowedMatrix();
    setPermissions(matrix);
    return matrix;
  } catch {
    // On failure don't lock the user out — fall back to all-allowed.
    const m = allAllowedMatrix();
    setPermissions(m);
    return m;
  }
}

export function can(resource: ResourceId, action: Action = "read"): boolean {
  if (isAllAccessRole(currentRole())) return true;
  const m = readCache();
  return m[resource]?.[action] ?? true;
}

// Resolve a pathname to the resource that guards it (longest prefix wins).
export function resourceForPath(pathname: string): ResourceId | null {
  let best: { id: ResourceId; len: number } | null = null;
  for (const r of RESOURCES) {
    for (const route of r.routes) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        if (!best || route.length > best.len) best = { id: r.id, len: route.length };
      }
    }
  }
  return best?.id ?? null;
}

// The dashboard route a role should land on after sign-in: its own dashboard
// where possible, else the first page it's allowed to read.
export function landingRoute(role?: string | null): string {
  if (role === "super_admin") return "/dashboard/overview";
  if (role === "owner" || role === "business_admin") return "/dashboard/home";
  if (role === "fb_manager" && can("menu")) return "/dashboard/fb";
  for (const r of RESOURCES) {
    if (can(r.id, "read")) return r.routes[0];
  }
  return "/dashboard/home";
}
