import { api } from "@/infrastructure/api/http-client";
import { isOnline } from "@/infrastructure/api/http-client";
import { getLocalDb, localDbTables } from "@/db/localDb";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/shared/utils/sessionUser";

const parseRawJson = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const readRows = async (table: any) => {
  const db = await getLocalDb();
  const rows = await db.select().from(table);
  return rows.map((row: any) => {
    const parsed = parseRawJson(row?.raw_json);
    return parsed && typeof parsed === "object" ? { ...row, ...parsed } : row;
  });
};

const findById = async (table: any, id: string) => {
  const db = await getLocalDb();
  const rows = await db.select().from(table).where(eq(table.id, id));
  if (!rows[0]) return null;
  const parsed = parseRawJson(rows[0]?.raw_json);
  return parsed && typeof parsed === "object"
    ? { ...rows[0], ...parsed }
    : rows[0];
};

const clearRows = async (table: any) => {
  const db = await getLocalDb();
  await db.delete(table);
};

const upsertRow = async (table: any, row: any) => {
  const db = await getLocalDb();
  const payload: Record<string, any> = {
    ...row,
    id: row?.id,
    synced: Number(row?.synced ?? 0),
    raw_json: JSON.stringify({
      ...row,
      id: row?.id,
    }),
  };

  for (const key of Object.keys(payload)) {
    if (typeof payload[key] === "boolean") payload[key] = payload[key] ? 1 : 0;
    if (payload[key] === undefined) delete payload[key];
  }

  if (!payload.id) {
    throw new Error("upsertRow requires an id");
  }

  await db.insert(table).values(payload as any).onConflictDoUpdate({
    target: table.id,
    set: payload as any,
  });
  return payload.id;
};

const deleteById = async (table: any, id: string) => {
  const db = await getLocalDb();
  await db.delete(table).where(eq(table.id, id));
};

const upsertSystemSetting = async (key: string, value: string) => {
  try {
    const db = await getLocalDb();
    const existing = await db
      .select()
      .from(localDbTables.systemSettings as any)
      .where(eq((localDbTables.systemSettings as any).key, key));
    if (existing.length > 0) {
      await db
        .update(localDbTables.systemSettings as any)
        .set({ value, updated_at: new Date() })
        .where(eq((localDbTables.systemSettings as any).key, key));
    } else {
      await db.insert(localDbTables.systemSettings as any).values({ key, value, updated_at: new Date() });
    }
  } catch (err) {
    console.warn("[settingsApi] Failed to upsert system setting:", err);
  }
};

const getCurrentUserIdHeader = () => {
  try {
    const sessionUser = getSessionUser();
    const userId = sessionUser?.id;
    if (!userId) return {};
    return {
      "x-app-client": "tauri-pos-app",
      "x-user-id": String(userId),
    };
  } catch {
    return {};
  }
};

const cacheCancelPasswordOnCurrentUser = async (
  cancelPassword?: string | null,
) => {
  if (cancelPassword === undefined) return;

  try {
    const sessionUser = getSessionUser();
    const currentUserId = sessionUser?.id ? String(sessionUser.id) : null;
    if (!currentUserId) return;

    let user = await findById(localDbTables.users, currentUserId);

    if (user?.id) {
      await upsertRow(localDbTables.users, {
        ...user,
        cancel_password: cancelPassword,
        synced: 1,
      });
    }
  } catch (error) {
    console.error(
      "[settingsApi] Failed to cache cancel password locally:",
      error,
    );
  }
};

const cachePrintCopiesOnCurrentUser = async (printCopies?: number) => {
  if (printCopies === undefined) return;

  try {
    const sessionUser = getSessionUser();
    const currentUserId = sessionUser?.id ? String(sessionUser.id) : null;
    if (!currentUserId) return;

    let user = await findById(localDbTables.users, currentUserId);

    if (user?.id) {
      await upsertRow(localDbTables.users, {
        ...user,
        print_copies: printCopies,
        synced: 1,
      });
    }
  } catch (error) {
    console.error("[settingsApi] Failed to cache print copies locally:", error);
  }
};

// ── Payment Methods ───────────────────────────────────────────────────────────
export const settingsAdapter = {
  /** Get all active payment methods from the backend */
  getPaymentMethods: async () => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/payment-methods");
        const list =
          (response as any)?.data?.data?.payment_methods ??
          (response as any)?.data?.payment_methods ??
          [];
        if (Array.isArray(list)) {
          // Clear and cache fetched payment methods locally
          await clearRows(localDbTables.paymentMethods);
          for (const pm of list) {
            await upsertRow(localDbTables.paymentMethods, {
              id: pm.id,
              name: pm.name,
              display_name: pm.display_name,
              icon: pm.icon || "",
              description: pm.description || "",
              is_active: pm.is_active,
              synced: 1,
            } as any);
          }
        }
        return response;
      } catch (err) {
        console.warn(
          "[settingsApi] Failed to fetch payment methods online, falling back to localDb:",
          err,
        );
      }
    }

    const localList = await readRows(localDbTables.paymentMethods);
    return {
      data: {
        status: "success",
        data: {
          payment_methods: localList,
          count: localList.length,
        },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any;
  },

  /** Create a new payment method (admin) */
  createPaymentMethod: async (data: {
    name: string;
    display_name: string;
    icon?: string;
    description?: string;
    is_active?: boolean;
  }) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Payment method management requires an internet connection"),
      );
    }

    const response = await api.post("/settings/payment-methods", data);
    try {
      const pm =
        response?.data?.data?.payment_method ??
        response?.data?.payment_method ??
        response?.data?.data ??
        response?.data;
      if (pm && pm.id) {
        await upsertRow(localDbTables.paymentMethods, {
          id: pm.id,
          name: pm.name || data.name,
          display_name: pm.display_name || data.display_name,
          icon: pm.icon || data.icon || "",
          description: pm.description || data.description || "",
          is_active:
            pm.is_active !== undefined
              ? pm.is_active
              : data.is_active !== undefined
                ? data.is_active
                : true,
          synced: 1,
        });
      }
    } catch (err) {
      console.warn(
        "[settingsApi] Failed to cache newly created payment method:",
        err,
      );
    }
    return response;
  },

  /** Update an existing payment method (admin) */
  updatePaymentMethod: async (
    id: string,
    data: {
      name: string;
      display_name: string;
      icon?: string;
      description?: string;
      is_active?: boolean;
    },
  ) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Payment method management requires an internet connection"),
      );
    }

    const response = await api.put(`/settings/payment-methods/${id}`, data);
    try {
      let localPm = await findById(localDbTables.paymentMethods, String(id));
      if (localPm && localPm.id) {
        await upsertRow(localDbTables.paymentMethods, {
          ...localPm,
          name: data.name,
          display_name: data.display_name,
          icon: data.icon,
          description: data.description,
          is_active: data.is_active,
          synced: 1,
        });
      }
    } catch (err) {
      console.warn(
        "[settingsApi] Failed to update local payment method cache:",
        err,
      );
    }
    return response;
  },

  /** Soft-delete a payment method (admin) */
  deletePaymentMethod: async (id: string) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Payment method management requires an internet connection"),
      );
    }

    const response = await api.delete(`/settings/payment-methods/${id}`);
    try {
      const localPm = await findById(localDbTables.paymentMethods, String(id));
      if (localPm && localPm.id) {
        await deleteById(localDbTables.paymentMethods, String(localPm.id));
      }
    } catch (err) {
      console.warn(
        "[settingsApi] Failed to delete local payment method cache:",
        err,
      );
    }
    return response;
  },

  // ── Roles ──────────────────────────────────────────────────────────────────

  getRoles: async () => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/roles");
        const list =
          (response as any)?.data?.data?.roles ??
          (response as any)?.data?.roles ??
          [];
        if (Array.isArray(list)) {
          // Clear and cache fetched roles locally
          await clearRows(localDbTables.roles);
          for (const role of list) {
            await upsertRow(localDbTables.roles, {
              id: role.id,
              name: role.name,
              display_name: role.display_name,
              description: role.description || "",
              is_active: role.is_active,
              synced: 1,
            } as any);
          }
        }
        return response;
      } catch (err) {
        console.warn(
          "[settingsApi] Failed to fetch roles online, falling back to localDb:",
          err,
        );
      }
    }

    const localList = await readRows(localDbTables.roles);
    return {
      data: {
        status: "success",
        data: {
          roles: localList,
          count: localList.length,
        },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any;
  },

  /** Get a single role by id */
  getRole: async (id: string) => {
    return api.get(`/settings/roles/${id}`);
  },

  /** Create a new role (admin) */
  createRole: async (data: {
    name: string;
    display_name: string;
    description?: string;
    is_active?: boolean;
  }) => {
    return api.post("/settings/roles", data);
  },

  /** Update a role (admin) */
  updateRole: async (
    id: string,
    data: {
      name: string;
      display_name: string;
      description?: string;
      is_active?: boolean;
    },
  ) => {
    return api.put(`/settings/roles/${id}`, data);
  },

  /** Disable a role (admin) */
  deleteRole: async (id: string) => {
    return api.delete(`/settings/roles/${id}`);
  },

  // ── Current-user settings ───────────────────────────────────────────────────

  /** Get cancel password and print copies for the logged-in user */
  getCurrentUserSettings: async () => {
    const response = await api.get("/settings/current-user-settings", {
      headers: getCurrentUserIdHeader(),
    });
    const settings = response?.data?.data ?? response?.data ?? {};
    await cacheCancelPasswordOnCurrentUser(settings?.cancel_password ?? null);
    return response;
  },

  /** Update the order-cancellation override password */
  updateCancelPassword: async (password: string) => {
    // Admin/user config: set online only. We still cache the resulting hash
    // locally so the cashier can validate order cancellations offline.
    if (!isOnline()) {
      return Promise.reject(
        new Error(
          "Updating the cancel password requires an internet connection",
        ),
      );
    }

    const hashed = await hash(password, 10);
    const response = await api.put(
      "/settings/current-user-settings/cancel-password",
      { cancel_password: password },
      { headers: getCurrentUserIdHeader() },
    );
    const updated = response?.data?.data ?? response?.data ?? {};
    await cacheCancelPasswordOnCurrentUser(updated?.cancel_password ?? hashed);
    return response;
  },

  /** Update how many order copies to print */
  updatePrintCopies: async (copies: number) => {
    if (isOnline()) {
      const response = await api.put(
        "/settings/current-user-settings/print-copies",
        { print_copies: copies },
        {
          headers: getCurrentUserIdHeader(),
        },
      );
      try {
        const updated = response?.data?.data ?? response?.data ?? {};
        await cachePrintCopiesOnCurrentUser(updated?.print_copies ?? copies);
      } catch (err) {
        console.warn(
          "[settingsApi] Failed to cache print copies locally:",
          err,
        );
      }
      return response;
    }

    // Offline fallback
    await cachePrintCopiesOnCurrentUser(copies);
    return {
      data: {
        status: "success",
        data: { print_copies: copies },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    } as any;
  },

  // ── System / Inventory Settings ─────────────────────────────────────────────

  /**
   * Fetch every system settings key/value pair from the backend and cache them
   * locally. Called on login so the local DB mirrors the system_settings table.
   */
  syncAllSystemSettings: async (): Promise<Record<string, string>> => {
    if (!isOnline()) {
      try {
        const db = await getLocalDb();
        const rows = await db
          .select()
          .from(localDbTables.systemSettings as any);
        return rows.reduce((acc: Record<string, string>, r: any) => {
          if (r?.key != null) acc[r.key] = r.value;
          return acc;
        }, {});
      } catch {
        return {};
      }
    }

    try {
      const response = await api.get("/settings/system/all", {
        headers: getCurrentUserIdHeader(),
      });
      const list =
        (response as any)?.data?.data?.settings ??
        (response as any)?.data?.settings ??
        [];
      const result: Record<string, string> = {};
      if (Array.isArray(list)) {
        for (const setting of list) {
          if (setting?.key == null) continue;
          const value = setting.value ?? "";
          await upsertSystemSetting(String(setting.key), String(value));
          result[String(setting.key)] = String(value);
        }
      }
      return result;
    } catch (err) {
      console.warn(
        "[settingsApi] Failed to sync all system settings, using local cache:",
        err,
      );
      try {
        const db = await getLocalDb();
        const rows = await db
          .select()
          .from(localDbTables.systemSettings as any);
        return rows.reduce((acc: Record<string, string>, r: any) => {
          if (r?.key != null) acc[r.key] = r.value;
          return acc;
        }, {});
      } catch {
        return {};
      }
    }
  },

  /** Read the cached allow_low_stock_orders setting from local DB */
  getLocalInventorySettings: async (): Promise<{ allow_low_stock_orders: boolean }> => {
    try {
      const db = await getLocalDb();
      const rows = await db.select().from(localDbTables.systemSettings as any);
      const row = rows.find((r: any) => r.key === "allow_low_stock_orders");
      return { allow_low_stock_orders: row?.value === "true" };
    } catch {
      return { allow_low_stock_orders: false };
    }
  },

  /** Fetch system inventory settings (online) and cache locally */
  getSystemSettings: async (): Promise<{ allow_low_stock_orders: boolean }> => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/system/inventory");
        const data = (response as any)?.data?.data ?? (response as any)?.data ?? {};
        const allowLowStock = Boolean(data?.allow_low_stock_orders);
        await upsertSystemSetting("allow_low_stock_orders", allowLowStock ? "true" : "false");
        return { allow_low_stock_orders: allowLowStock };
      } catch (err) {
        console.warn("[settingsApi] Failed to fetch system settings, using local cache:", err);
      }
    }
    return settingsAdapter.getLocalInventorySettings();
  },

  /** Update system inventory settings (admin) */
  updateInventorySettings: async (data: { allow_low_stock_orders: boolean }) => {
    // Admin-only: set online. The local KV cache (read by the cashier during
    // order creation) is refreshed only after the backend confirms.
    if (!isOnline()) {
      return Promise.reject(
        new Error("Updating system settings requires an internet connection"),
      );
    }

    const response = await api.put("/settings/system/inventory", data);
    await upsertSystemSetting(
      "allow_low_stock_orders",
      data.allow_low_stock_orders ? "true" : "false",
    );
    return (response as any)?.data?.data ?? data;
  },

  /** Read the cached force_table_selection setting from local DB */
  getLocalTableSelectionSettings: async (): Promise<{ force_table_selection: boolean }> => {
    try {
      const db = await getLocalDb();
      const rows = await db.select().from(localDbTables.systemSettings as any);
      const row = rows.find((r: any) => r.key === "force_table_selection");
      return { force_table_selection: row?.value === "true" };
    } catch {
      return { force_table_selection: false };
    }
  },

  /** Fetch table selection settings (online) and cache locally */
  getTableSelectionSettings: async (): Promise<{ force_table_selection: boolean }> => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/system/table-selection");
        const data = (response as any)?.data?.data ?? (response as any)?.data ?? {};
        const forceTableSelection = Boolean(data?.force_table_selection);
        await upsertSystemSetting("force_table_selection", forceTableSelection ? "true" : "false");
        return { force_table_selection: forceTableSelection };
      } catch (err) {
        console.warn("[settingsApi] Failed to fetch table selection settings, using local cache:", err);
      }
    }
    return settingsAdapter.getLocalTableSelectionSettings();
  },

  /** Update table selection settings (admin) */
  updateTableSelectionSettings: async (data: { force_table_selection: boolean }) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Updating system settings requires an internet connection"),
      );
    }

    const response = await api.put("/settings/system/table-selection", data);
    await upsertSystemSetting(
      "force_table_selection",
      data.force_table_selection ? "true" : "false",
    );
    return (response as any)?.data?.data ?? data;
  },

  // ── Organization Settings ────────────────────────────────────────────────────

  /** Read the cached allow_cashier_manage_org_orders setting from local DB */
  getLocalOrganizationSettings: async (): Promise<{
    allow_cashier_manage_org_orders: boolean;
  }> => {
    try {
      const db = await getLocalDb();
      const rows = await db.select().from(localDbTables.systemSettings as any);
      const row = rows.find(
        (r: any) => r.key === "allow_cashier_manage_org_orders",
      );
      return { allow_cashier_manage_org_orders: row?.value === "true" };
    } catch {
      return { allow_cashier_manage_org_orders: false };
    }
  },

  /** Fetch organization system settings (online) and cache locally */
  getOrganizationSettings: async (): Promise<{
    allow_cashier_manage_org_orders: boolean;
  }> => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/system/organizations");
        const data =
          (response as any)?.data?.data ?? (response as any)?.data ?? {};
        const allow = Boolean(data?.allow_cashier_manage_org_orders);
        await upsertSystemSetting(
          "allow_cashier_manage_org_orders",
          allow ? "true" : "false",
        );
        return { allow_cashier_manage_org_orders: allow };
      } catch (err) {
        console.warn(
          "[settingsApi] Failed to fetch organization settings, using local cache:",
          err,
        );
      }
    }
    return settingsAdapter.getLocalOrganizationSettings();
  },

  /** Update organization system settings (admin) */
  updateOrganizationSettings: async (data: {
    allow_cashier_manage_org_orders: boolean;
  }) => {
    // Admin-only: set online. The local KV cache (read by the cashier to gate
    // org-order access) is refreshed only after the backend confirms.
    if (!isOnline()) {
      return Promise.reject(
        new Error("Updating system settings requires an internet connection"),
      );
    }

    const response = await api.put("/settings/system/organizations", data);
    await upsertSystemSetting(
      "allow_cashier_manage_org_orders",
      data.allow_cashier_manage_org_orders ? "true" : "false",
    );
    return (response as any)?.data?.data ?? data;
  },

  // ── Receipt Feature Settings ──────────────────────────────────────────────────

  /** Read the cached enable_cashier_receipt setting from local DB */
  getLocalReceiptSettings: async (): Promise<{ enable_cashier_receipt: boolean }> => {
    try {
      const db = await getLocalDb();
      const rows = await db.select().from(localDbTables.systemSettings as any);
      const row = rows.find((r: any) => r.key === "enable_cashier_receipt");
      return { enable_cashier_receipt: row?.value === "true" };
    } catch {
      return { enable_cashier_receipt: false };
    }
  },

  /** Fetch receipt settings (online) and cache locally */
  getReceiptSettings: async (): Promise<{ enable_cashier_receipt: boolean }> => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/system/receipt");
        const data = (response as any)?.data?.data ?? (response as any)?.data ?? {};
        const enableReceipt = Boolean(data?.enable_cashier_receipt);
        await upsertSystemSetting("enable_cashier_receipt", enableReceipt ? "true" : "false");
        return { enable_cashier_receipt: enableReceipt };
      } catch (err) {
        console.warn("[settingsApi] Failed to fetch receipt settings, using local cache:", err);
      }
    }
    return settingsAdapter.getLocalReceiptSettings();
  },

  // ── Printer Department Routing ────────────────────────────────────────────────

  /** Read the cached printer routing map from the local system-settings KV. */
  getLocalPrinterRoutingSettings: async (): Promise<Record<string, any>> => {
    try {
      const db = await getLocalDb();
      const rows = await db.select().from(localDbTables.systemSettings as any);
      const row = rows.find((r: any) => r.key === "printer_department_routing");
      const parsed = parseRawJson(row?.value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  },

  /** Fetch the branch printer routing map (online) and cache it locally. */
  getPrinterRoutingSettings: async (): Promise<Record<string, any>> => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/system/printer-routing");
        const data =
          (response as any)?.data?.data ?? (response as any)?.data ?? {};
        const map = data?.printer_department_routing ?? {};
        const safeMap =
          map && typeof map === "object" && !Array.isArray(map) ? map : {};
        await upsertSystemSetting(
          "printer_department_routing",
          JSON.stringify(safeMap),
        );
        return safeMap;
      } catch (err) {
        console.warn(
          "[settingsApi] Failed to fetch printer routing, using local cache:",
          err,
        );
      }
    }
    return settingsAdapter.getLocalPrinterRoutingSettings();
  },

  /**
   * Persist the branch printer routing map. Caches locally first so the config
   * survives offline, then pushes to the backend best-effort when online.
   */
  updatePrinterRoutingSettings: async (
    map: Record<string, any>,
  ): Promise<Record<string, any>> => {
    const safeMap =
      map && typeof map === "object" && !Array.isArray(map) ? map : {};
    await upsertSystemSetting(
      "printer_department_routing",
      JSON.stringify(safeMap),
    );
    if (isOnline()) {
      try {
        await api.put("/settings/system/printer-routing", {
          printer_department_routing: safeMap,
        });
      } catch (err) {
        console.warn(
          "[settingsApi] Failed to push printer routing to backend:",
          err,
        );
      }
    }
    return safeMap;
  },

  // ── Printer Settings Password ─────────────────────────────────────────────────
  // Owner sets this branch-scoped password from the web dashboard. Cashiers must
  // enter it before opening the POS printer settings. The hash is mirrored into
  // the local system-settings KV by syncAllSystemSettings (on login), so the gate
  // still works offline. Online we prefer the backend so a freshly-set password
  // takes effect without waiting for the next login sync.

  /** Read the mirrored printer-settings password hash from the local KV. */
  getLocalPrinterPasswordHash: async (): Promise<string | null> => {
    try {
      const db = await getLocalDb();
      const rows = await db.select().from(localDbTables.systemSettings as any);
      const row = rows.find(
        (r: any) => r.key === "printer_settings_password",
      );
      return row?.value ? String(row.value) : null;
    } catch {
      return null;
    }
  },

  /**
   * Whether a printer-settings password is configured for this branch.
   *
   * `determined` reports whether we could establish the answer with confidence.
   * When online, only a successful server response counts as determined — a
   * failed request (server down, route missing) leaves it `false` so the caller
   * can fail closed instead of assuming there is no password. When offline, the
   * mirrored hash is authoritative (it only exists once a sync has run).
   */
  getPrinterPasswordStatus: async (): Promise<{
    is_set: boolean;
    determined: boolean;
  }> => {
    if (isOnline()) {
      try {
        const response = await api.get("/settings/system/printer-password");
        const data =
          (response as any)?.data?.data ?? (response as any)?.data ?? {};
        return { is_set: Boolean(data?.is_set), determined: true };
      } catch (err) {
        console.warn(
          "[settingsApi] Failed to fetch printer password status; failing closed:",
          err,
        );
        // Could not reach the server while online — do NOT fall back to the
        // (possibly stale/absent) local hash and risk letting someone in.
        return { is_set: true, determined: false };
      }
    }
    // Offline: rely on the hash mirrored by the last system/all sync.
    const hash = await settingsAdapter.getLocalPrinterPasswordHash();
    return { is_set: !!hash, determined: true };
  },

  /** Verify a typed printer-settings password. Online hits the backend; offline
   * (or on failure) it falls back to comparing against the mirrored local hash. */
  verifyPrinterPassword: async (password: string): Promise<boolean> => {
    if (isOnline()) {
      try {
        const response = await api.post(
          "/settings/system/printer-password/verify",
          { printer_password: password },
        );
        const data =
          (response as any)?.data?.data ?? (response as any)?.data ?? {};
        return Boolean(data?.valid);
      } catch (err) {
        console.warn(
          "[settingsApi] Online printer password verify failed, trying local hash:",
          err,
        );
      }
    }
    const stored = await settingsAdapter.getLocalPrinterPasswordHash();
    if (!stored) return false;
    try {
      if (stored.startsWith("$2")) {
        const { compare } = await import("bcryptjs");
        return compare(password, stored);
      }
      return password === stored;
    } catch {
      return false;
    }
  },

  /** Update receipt settings (admin) */
  updateReceiptSettings: async (data: { enable_cashier_receipt: boolean }) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Updating system settings requires an internet connection"),
      );
    }

    const response = await api.put("/settings/system/receipt", data);
    await upsertSystemSetting(
      "enable_cashier_receipt",
      data.enable_cashier_receipt ? "true" : "false",
    );
    return (response as any)?.data?.data ?? data;
  },
};

export default settingsAdapter;
