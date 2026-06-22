// Shared RBAC vocabulary for the web back office. Kept in sync with the web's
// web/lib/permissions.ts. Resources are derived from the dashboard nav; each
// resource supports the four CRUD actions below.

export const ACTIONS = ["read", "write", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

export type ResourcePermissions = Record<Action, boolean>;
export type PermissionMatrix = Record<string, ResourcePermissions>;

// Resource ids guarded across the back office (one per dashboard area).
export const RESOURCES = [
  "orders",
  "payments",
  "items_sold",
  "tables",
  "menu",
  "inventory",
  "stock_locations",
  "transfers",
  "staff",
  "customers",
  "reports",
  "expenses",
  "settings",
  "payment_methods",
  "roles",
  "devices",
] as const;
export type Resource = (typeof RESOURCES)[number];

// Roles the owner can configure. super_admin / owner / business_admin are always
// all-access and never appear here.
export const CONFIGURABLE_ROLES = [
  "admin",
  "fb_manager",
  "finance",
  "cashier",
  "cafe_waiter",
  "kitchen_staff",
  "barista",
  "host",
  "storekeeper",
  "accountant",
  "housekeeping",
] as const;

// Roles that bypass all permission checks (full access).
export const ALL_ACCESS_ROLES = ["super_admin", "owner", "business_admin"];

export function isAllAccessRole(role?: string | null): boolean {
  return !!role && ALL_ACCESS_ROLES.includes(role);
}

// A full matrix with every action allowed — the default when no row is stored.
export function allAllowedMatrix(): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const resource of RESOURCES) {
    matrix[resource] = { read: true, write: true, update: true, delete: true };
  }
  return matrix;
}

// Merge a stored (possibly partial) matrix over the all-allowed defaults so a
// missing resource/action reads as allowed.
export function withDefaults(stored?: PermissionMatrix | null): PermissionMatrix {
  const base = allAllowedMatrix();
  if (!stored) return base;
  for (const resource of RESOURCES) {
    const row = stored[resource];
    if (!row) continue;
    base[resource] = {
      read: row.read ?? true,
      write: row.write ?? true,
      update: row.update ?? true,
      delete: row.delete ?? true,
    };
  }
  return base;
}
