import { generateLocalId, getLocalDb, localDbTables } from "@/db/localDb";
import { api, isOnline } from "@/infrastructure/api/http-client";
import { eq } from "drizzle-orm";
import { getApproximateServerIsoString } from "@/shared/utils/serverTime";

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

const normalizeDbBoolean = (value: any) =>
  typeof value === "boolean" ? value : Number(value ?? 0) === 1;

const fallbackFromColumns = (table: any, row: any) => {
  if (!row || typeof row !== "object") return null;

  if (table === localDbTables.menuItems) {
    return {
      ...row,
      is_available: normalizeDbBoolean(row?.is_available),
      synced: Number(row?.synced ?? 0),
    };
  }

  if (table === localDbTables.categories) {
    return {
      ...row,
      is_active: normalizeDbBoolean(row?.is_active),
      display_order: Number(row?.display_order ?? 0),
      synced: Number(row?.synced ?? 0),
    };
  }

  if (table === localDbTables.mainCategories) {
    return {
      ...row,
      is_active: normalizeDbBoolean(row?.is_active),
      display_order: Number(row?.display_order ?? 0),
      synced: Number(row?.synced ?? 0),
    };
  }

  if (table === localDbTables.menuItemCategories) {
    return {
      ...row,
      menu_item_id: String(row?.menu_item_id ?? ""),
      category_id: String(row?.category_id ?? ""),
      synced: Number(row?.synced ?? 0),
    };
  }

  return row;
};

const readRows = async (table: any) => {
  const db = await getLocalDb();
  const rows = await db.select().from(table);
  return rows.map((row: any) => {
    const fallback = fallbackFromColumns(table, row);
    const parsed = parseRawJson(row?.raw_json);
    if (parsed && typeof parsed === "object") {
      return { ...fallback, ...parsed };
    }
    return fallback;
  });
};

const clearRows = async (table: any) => {
  const db = await getLocalDb();
  await db.delete(table);
};

const toDbPayload = (row: any, fallbackId?: string) => {
  const targetId = row?.id ?? fallbackId ?? generateLocalId();
  const payload: Record<string, any> = {
    ...row,
    id: targetId,
    synced: Number(row?.synced ?? 0),
    raw_json: JSON.stringify({
      ...row,
      id: targetId,
    }),
  };

  for (const key of Object.keys(payload)) {
    if (typeof payload[key] === "boolean") {
      payload[key] = payload[key] ? 1 : 0;
    }
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  return payload;
};

const upsertRow = async (table: any, row: any) => {
  const db = await getLocalDb();
  const targetId = row?.id ?? generateLocalId();
  const payload = toDbPayload({ ...row, id: targetId });

  await db
    .insert(table)
    .values(payload as any)
    .onConflictDoUpdate({
      target: table.id,
      set: payload as any,
    });

  return targetId;
};

const findByIdOrRemote = async (table: any, id: string) => {
  const db = await getLocalDb();
  const byId = await db.select().from(table).where(eq(table.id, id));
  if (byId[0]) {
    const fallback = fallbackFromColumns(table, byId[0]);
    const parsed = parseRawJson(byId[0]?.raw_json);
    return parsed && typeof parsed === "object"
      ? { ...fallback, ...parsed }
      : fallback;
  }
  return null;
};

const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    // Keep Unicode letters/numbers — an [a-z0-9]-only slug collapses every Amharic
    // category to "" (breaks category derivation, dedup and filter matching).
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

const normalizeCategory = (category: any, fallbackType = "main") => {
  const name = String(
    category?.name || category?.slug || category || "",
  ).trim();
  const slug = slugify(category?.slug || name);
  if (!name || !slug) return null;

  return {
    id: category?.id,
    name,
    slug,
    icon: category?.icon ?? "",
    display_order: Number(
      category?.display_order ?? category?.displayOrder ?? 0,
    ),
    type: category?.type ?? fallbackType,
    is_active:
      typeof category?.is_active === "boolean"
        ? category.is_active
        : category?.isActive !== undefined
          ? !!category.isActive
          : true,
    synced: 1 as const,
  };
};

const categoriesFromItem = (item: any) => {
  const explicit = Array.isArray(item?.categories)
    ? item.categories
        .map((category: any) => normalizeCategory(category))
        .filter(Boolean)
    : [];

  if (explicit.length > 0) return explicit;

  const fallbackCategory =
    item?.category ?? item?.sub_category ?? item?.main_category ?? item?.type;
  const fallback = normalizeCategory({
    name: fallbackCategory || "Cafe",
    slug: fallbackCategory || "cafe",
    type: "main",
  });

  return fallback ? [fallback] : [];
};

const mainCategoriesFromItems = (items: any[]) => {
  const unique = new Map<string, { name: string; slug: string }>();

  for (const item of items || []) {
    const raw = String(item?.main_category || "").trim();
    if (!raw) continue;

    const slug = slugify(raw);
    if (!slug || unique.has(slug)) continue;

    const name = raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    unique.set(slug, { name, slug });
  }

  return Array.from(unique.values());
};

const persistLocalMainCategories = async (entries: any[]) => {
  for (const entry of entries || []) {
    const slug = slugify(entry?.slug || entry?.name || "");
    if (!slug) continue;

    const name = String(entry?.name || slug)
      .trim()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    const existing = (await readRows(localDbTables.mainCategories)).find(
      (item: any) => item.slug === slug,
    );

    const record = {
      id: existing?.id ?? entry?.id,
      name,
      slug,
      display_order: Number(
        entry?.display_order ??
          entry?.displayOrder ??
          existing?.display_order ??
          0,
      ),
      is_active:
        typeof entry?.is_active === "boolean"
          ? entry.is_active
          : entry?.isActive !== undefined
            ? !!entry.isActive
            : existing?.is_active !== undefined
              ? !!existing.is_active
              : true,
      synced: 1 as const,
      created_at: existing?.created_at,
      updated_at: getApproximateServerIsoString(),
    };

    await upsertRow(localDbTables.mainCategories, record as any);
  }
};

const extractMenuItems = (payload: any): any[] => {
  const candidates = [
    payload?.data?.menuItems,
    payload?.menuItems,
    payload?.data?.items,
    payload?.items,
    payload?.data,
    payload,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const normalizeMenuItem = (item: any) => {
  const category = item?.category ?? item?.sub_category ?? "";
  const categories = categoriesFromItem(item);
  const primaryCategory =
    categories.find((entry: any) => entry.type === "main") ?? categories[0];

  return {
    ...item,
    id: item?.id,
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: Number(item?.price ?? 0),
    main_category:
      item?.main_category ?? item?.type ?? primaryCategory?.slug ?? "cafe",
    sub_category: item?.sub_category ?? category,
    category: category || primaryCategory?.slug || "",
    categories,
    type: item?.type ?? item?.main_category ?? "cafe",
    is_available:
      typeof item?.is_available === "boolean"
        ? item.is_available
        : item?.available !== undefined
          ? !!item.available
          : true,
    image_url: item?.image_url ?? "",
    prep_time_minutes: Number(
      item?.prep_time_minutes ?? item?.prepTimeMinutes ?? 0,
    ),
    sku: item?.sku ?? "",
    barcode: item?.barcode ?? "",
    predefined_notes: Array.isArray(item?.predefined_notes)
      ? item.predefined_notes
      : Array.isArray(item?.meta?.predefined_notes)
        ? item.meta.predefined_notes
        : [],
    synced: 1,
  };
};

const cacheRemoteMenuItems = async (remoteItems: any[], clearCache: boolean = false) => {
  const normalizedItems = remoteItems.map(normalizeMenuItem);
  
  if (clearCache) {
    await clearRows(localDbTables.menuItems);
    await clearRows(localDbTables.categories);
    await clearRows(localDbTables.menuItemCategories);
  }
  
  for (const item of normalizedItems)
    await upsertRow(localDbTables.menuItems, item);
  await persistLocalCategories(normalizedItems);
  return normalizedItems;
};

const persistLocalCategories = async (items: any[]) => {
  const categoriesBySlug = new Map<string, any>();
  for (const item of items) {
    for (const category of item.categories || []) {
      if (category?.slug) categoriesBySlug.set(category.slug, category);
    }
  }

  const categoryRows: any[] = [];
  for (const category of categoriesBySlug.values()) {
    const existing = (await readRows(localDbTables.categories)).find(
      (item: any) => item.slug === category.slug,
    );
    const localCategory = {
      ...category,
      id: existing?.id ?? category.id,
    };
    const id = await upsertRow(localDbTables.categories, localCategory);
    categoryRows.push({ ...localCategory, id });
  }

  const categoryIdBySlug = new Map(
    categoryRows.map((category) => [category.slug, category.id]),
  );
  const pivotRows: any[] = [];
  for (const item of items) {
    for (const category of item.categories || []) {
      const categoryId = categoryIdBySlug.get(category.slug);
      if (!categoryId) continue;
      pivotRows.push({
        menu_item_id: item.id,
        category_id: categoryId,
        synced: 1,
      });
    }
  }

  if (pivotRows.length > 0) {
    for (const row of pivotRows)
      await upsertRow(localDbTables.menuItemCategories, row);
  }
};

const fetchAndCacheMenuItems = async (path: string) => {
  const response = await api.get(path);
  const payload = response?.data as any;

  const remoteItems = extractMenuItems(payload);
  const cachedItems = await cacheRemoteMenuItems(remoteItems);

  return {
    data: { status: "success", data: { menuItems: cachedItems } },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as any,
  };
};

const menuAdapterImpl = {
  getAll: async (params?: any, forceSync: boolean = false) => {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    if (isOnline() && forceSync) {
      try {
        const response = await api.get("/menu", { params: { page, limit } });
        const payload = response?.data as any;
        const remoteItems = extractMenuItems(payload);
        
        // Cache the fetched items without clearing existing cache
        if (remoteItems.length > 0) {
          await cacheRemoteMenuItems(remoteItems, false);
        }

        return response;
      } catch (err) {
        console.error(
          "Error fetching menu items online, falling back to localDb:",
          err,
        );
      }
    }

    const allItems = await readRows(localDbTables.menuItems);
    const paginatedItems = allItems.slice(skip, skip + limit);
    const totalCount = allItems.length;

    return {
      data: { 
        status: "success", 
        data: { 
          menuItems: paginatedItems,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        } 
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getById: async (id: string, forceSync: boolean = false) => {
    if (isOnline() && forceSync) {
      try {
        const response = await api.get(`/menu/${id}`);
        const remoteItem =
          response?.data?.data?.menuItem ?? response?.data?.menuItem;
        if (remoteItem) {
          const normalizedItem = normalizeMenuItem(remoteItem);
          await upsertRow(localDbTables.menuItems, normalizedItem as any);
          return {
            data: { status: "success", data: normalizedItem },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as any,
          };
        }
      } catch (err) {
        console.error(
          "Error fetching menu item online, falling back to localDb:",
          err,
        );
      }
    }

    const item = await findByIdOrRemote(localDbTables.menuItems, id);
    if (item) {
      return {
        data: { status: "success", data: item },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };
    }
    return {
      data: { status: "error", message: "Menu item not found locally" },
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any;
  },
  getBakeryMenu: () => menuAdapterImpl.getCafeMenu(),
  getCafeMenu: async (forceSync: boolean = false) => {
    if (isOnline() && forceSync) {
      try {
        return await fetchAndCacheMenuItems("/menu/cafe");
      } catch (err) {
        console.error(
          "Error fetching cafe menu online, falling back to localDb:",
          err,
        );
      }
    }

    const items = await readRows(localDbTables.menuItems);
    return {
      data: { status: "success", data: { menuItems: items } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  syncBulk: (payload: any) => api.post("/menu/sync", payload),
  getCategories: async (params?: any, forceSync: boolean = false) => {
    if (isOnline() && forceSync) {
      try {
        return await api.get("/menu/categories", { params });
      } catch (err) {
        console.error(
          "Error fetching categories online, falling back to localDb:",
          err,
        );
      }
    }

    let categories = await readRows(localDbTables.categories);
    if (params?.type)
      categories = categories.filter((item: any) => item.type === params.type);
    if (params?.is_active !== undefined) {
      const active = params.is_active === true || params.is_active === "true";
      categories = categories.filter(
        (item: any) => !!item.is_active === active,
      );
    }
    return {
      data: {
        status: "success",
        data: { categories, count: categories.length },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getMainCategories: async (params?: any) => {
    if (isOnline()) {
      try {
        const response = await api.get("/menu/main-categories", { params });
        const payload = response?.data as any;
        const entries = payload?.data?.mainCategories;

        if (Array.isArray(entries)) {
          await persistLocalMainCategories(entries);
        }
        return response;
      } catch (err) {
        console.error(
          "Error fetching main categories online, falling back to localDb:",
          err,
        );
      }
    }

    let mainCategories = await readRows(localDbTables.mainCategories);

    if (params?.is_active !== undefined) {
      const active = params.is_active === true || params.is_active === "true";
      mainCategories = mainCategories.filter(
        (item: any) => !!item.is_active === active,
      );
    }

    if (params?.search) {
      const query = String(params.search).trim().toLowerCase();
      mainCategories = mainCategories.filter((item: any) =>
        String(item?.name || "")
          .toLowerCase()
          .includes(query),
      );
    }

    if (mainCategories.length === 0) {
      const items = await readRows(localDbTables.menuItems);
      const derived = mainCategoriesFromItems(items).map((entry, index) => ({
        ...entry,
        display_order: index,
        is_active: true,
      }));
      if (derived.length > 0) {
        await persistLocalMainCategories(derived);
      }
      mainCategories = await readRows(localDbTables.mainCategories);
    }

    mainCategories = [...mainCategories].sort(
      (a: any, b: any) =>
        Number(a?.display_order ?? 0) - Number(b?.display_order ?? 0) ||
        String(a?.name || "").localeCompare(String(b?.name || "")),
    );

    return {
      data: {
        status: "success",
        data: { mainCategories, count: mainCategories.length },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  createMainCategory: async (data: { name: string }) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Menu management requires an internet connection"),
      );
    }

    const response = await api.post("/menu/main-categories", data);
    const payload = response?.data as any;
    const created =
      payload?.data?.mainCategories?.[0] ||
      payload?.mainCategories?.[0] ||
      payload?.data;

    if (created) {
      await persistLocalMainCategories([created]);
    }

    return response;
  },
  create: async (menuData: any) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Menu management requires an internet connection"),
      );
    }

    const response = await api.post("/menu", menuData);
    return response;
  },
  update: async (id: string, menuData: any) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Menu management requires an internet connection"),
      );
    }

    const response = await api.put(`/menu/${id}`, menuData);
    return response;
  },
  delete: async (id: string) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Menu management requires an internet connection"),
      );
    }

    const response = await api.delete(`/menu/${id}`);
    return response;
  },
  toggleAvailability: async (id: string) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Menu management requires an internet connection"),
      );
    }

    const response = await api.post(`/menu/${id}/toggle-availability`);
    return response;
  },
};

export const menuAdapter = menuAdapterImpl;
