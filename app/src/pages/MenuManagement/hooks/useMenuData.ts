import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import api from "@/application";
import { useAuth } from "@/context/AuthContext";
import { syncEngine } from "@/infrastructure/sync/sync-engine";
import { useSyncRefetch } from "@/hooks/useSyncRefetch";
import { MenuItem, MenuFormData, SyncStatus } from "../types";
import { DEFAULT_FORM } from "../constants";
import {
  getItemCategories,
  isFasting,
  itemHasCategory,
  normCat,
  slugifyCategory,
} from "../utils";
import type { LocalRecipe, LocalRecipeIngredient } from "@/db/types";

export const useMenuData = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchTimeoutRef = useRef<number | null>(null);
  const [mainCategories, setMainCategories] = useState<
    Array<{ name: string; slug: string }>
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(isAdmin ? "all" : "cafe");
  const [filterCategory, setFilterCategory] = useState("all");

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuFormData>({ ...DEFAULT_FORM });
  const [imagePreview, setImagePreview] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    online: true,
    syncing: false,
    unsyncedCount: 0,
  });

  // ── Recipe state ──────────────────────────────────────────────────────────
  const [recipesMap, setRecipesMap] = useState<Record<string, LocalRecipe>>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await api.menu.getAll(undefined, isAdmin);
      const payload = (response as any).data;
      const data =
        payload?.data?.menuItems ||
        payload?.menuItems ||
        payload?.data ||
        payload;
      const items = Array.isArray(data) ? data : [];
      setMenuItems(items);

      const fallback = Array.from(
        new Set(
          items
            .map((item) => slugifyCategory(item.main_category || ""))
            .filter(Boolean),
        ),
      ).map((slug) => ({
        slug,
        name: slug.replace(/-/g, " "),
      }));

      try {
        const categoriesResponse = await api.menu.getMainCategories({
          is_active: true,
        });
        const categoriesPayload = (categoriesResponse as any)?.data;
        const categoriesData =
          categoriesPayload?.data?.mainCategories ||
          categoriesPayload?.mainCategories ||
          categoriesPayload?.data ||
          [];

        const normalizedCategories = Array.isArray(categoriesData)
          ? categoriesData
            .map((entry: any) => {
              const rawSlug = String(entry?.slug || entry?.name || "")
                .trim()
                .toLowerCase();
              const slug = slugifyCategory(rawSlug);
              if (!slug) return null;
              const name = String(entry?.name || slug)
                .trim()
                .replace(/_/g, " ");
              return { name, slug };
            })
            .filter(Boolean)
          : [];

        if (normalizedCategories.length > 0) {
          setMainCategories(
            normalizedCategories as Array<{ name: string; slug: string }>,
          );
        } else {
          setMainCategories(
            fallback.length > 0
              ? fallback
              : [{ name: "Barista", slug: DEFAULT_FORM.main_category }],
          );
        }
      } catch {
        setMainCategories(
          fallback.length > 0
            ? fallback
            : [{ name: "Barista", slug: DEFAULT_FORM.main_category }],
        );
      }
    } catch (e: any) {
      toast.error(
        `Failed to load menu: ${e.response?.data?.message || e.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Refresh once background hydration / reconnect / manual sync completes.
  useSyncRefetch(() => {
    fetchMenu();
    fetchRecipes();
  });

  // ── Fetch recipes + inventory items for admin ────────────────────────────
  const fetchRecipes = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const allRecipes = await api.recipes.getAll();
      const map: Record<string, LocalRecipe> = {};
      for (const r of allRecipes) {
        if (r.menu_item_id) map[r.menu_item_id] = r;
      }
      setRecipesMap(map);
    } catch (e) {
      console.warn("[useMenuData] Failed to load recipes", e);
    }
  }, [isAdmin]);

  const fetchInventory = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await api.inventory.getAll();
      const items =
        (resp as any)?.data?.data?.items ?? (resp as any)?.data?.items ?? [];
      setInventoryItems(Array.isArray(items) ? items : []);
    } catch (e) {
      console.warn("[useMenuData] Failed to load inventory", e);
    }
  }, [isAdmin]);

  const fetchStockLocations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const resp = await api.stockLocations.getAll(true);
      const locs =
        (resp as any)?.data?.data?.locations ??
        (resp as any)?.data?.locations ??
        [];
      // Use remoteId as the canonical id so it matches the backend's
      // stock_locations.id (recipes.deduct_from_location_id is a server-side
      // FK). The local SQLite cache assigns its own sequential ids, so writing
      // loc.id directly would violate the FK. Fall back to local id only for
      // unsynced local-only locations.
      const mapped = (Array.isArray(locs) ? locs : []).map((loc: any) => ({
        ...loc,
        id: loc.remoteId ?? loc.remote_id ?? loc.id ?? 0,
      }));
      setStockLocations(mapped);
    } catch (e) {
      console.warn("[useMenuData] Failed to load stock locations", e);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRecipes();
    fetchInventory();
    fetchStockLocations();
  }, [fetchRecipes, fetchInventory, fetchStockLocations]);

  const saveRecipe = async (
    menuItemId: string,
    payload: {
      name: string;
      yield_quantity: number;
      deduct_strategy: string;
      deduct_from_location_id?: number | null;
      is_active: boolean;
      ingredients: Partial<LocalRecipeIngredient>[];
    },
  ) => {
    const existing = recipesMap[menuItemId];
    try {
      if (existing?.id) {
        await api.recipes.update(existing.id, { ...payload, menu_item_id: menuItemId });
      } else {
        await api.recipes.create({ ...payload, menu_item_id: menuItemId });
      }
      await fetchRecipes();
      toast.success("Recipe saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save recipe");
      throw e;
    }
  };

  const deleteRecipe = async (menuItemId: string) => {
    const existing = recipesMap[menuItemId];
    if (!existing?.id) return;
    if (!window.confirm("Delete this recipe? Stock will no longer auto-deduct for this item.")) return;
    try {
      await api.recipes.delete(existing.id);
      await fetchRecipes();
      toast.success("Recipe deleted");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to delete recipe");
    }
  };

  const handleManualSync = async () => {
    if (syncStatus.syncing) return;
    if (!syncStatus.online) {
      toast.error("You are offline. Cannot sync right now.");
      return;
    }
    toast.loading("Synchronizing menu data...", { id: "manual-sync-progress" });
    const success = await syncEngine.sync(['menu_items_pull', 'recipes_pull']);
    if (success) {
      toast.success("Synchronization completed successfully!", {
        id: "manual-sync-progress",
      });
      setCurrentPage(1);
      fetchMenu();
      fetchRecipes();
    } else {
      toast.error("Synchronization failed or nothing to sync.", {
        id: "manual-sync-progress",
      });
    }
  };

  const shouldShowSubCat = isFasting(formData.category);
  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(
          menuItems
            .flatMap((item) =>
              getItemCategories(item).map(
                (category: any) => category.slug || category.name,
              ),
            )
            .filter(Boolean),
        ),
      ),
    [menuItems],
  );

  // Memoized filtered items with debounced search
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const categoryNames = getItemCategories(item)
        .map((category: any) => `${category.name || ""} ${category.slug || ""}`)
        .join(" ");
      const matchSearch =
        !debouncedSearchTerm ||
        item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        categoryNames.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchType =
        filterType === "all" ||
        itemHasCategory(item, filterType) ||
        normCat(item.category) === filterType;
      const matchCat =
        !isFasting(filterType) ||
        filterCategory === "all" ||
        (item.sub_category || item.category) === filterCategory;
      return matchSearch && matchType && matchCat;
    });
  }, [menuItems, debouncedSearchTerm, filterType, filterCategory]);

  // Client-side pagination for filtered results
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const openAdd = useCallback(() => {
    setSelectedItem(null);
    setFormData({
      ...DEFAULT_FORM,
      main_category: mainCategories[0]?.slug || DEFAULT_FORM.main_category,
    });
    setImagePreview(null);
    setDialogOpen(true);
  }, [mainCategories]);

  const openEdit = useCallback(
    (item: MenuItem) => {
      setSelectedItem(item);
      setFormData({
        name: item.name,
        description: item.description || "",
        price: Number.isFinite(Number(item.price))
          ? String(parseInt(String(item.price), 10))
          : String(item.price || ""),
        category: normCat(item.category),
        main_category:
          item.main_category ||
          mainCategories[0]?.slug ||
          DEFAULT_FORM.main_category,
        tags: getItemCategories(item)
          .filter((category: any) => category.type !== "main")
          .map((category: any) => category.name)
          .join(", "),
        sub_category: item.sub_category || item.category || "",
        is_available: item.is_available,
        image_base64: "",
        prep_time_minutes: item.prep_time_minutes
          ? String(item.prep_time_minutes)
          : "",
        sku: item.sku || "",
        barcode: item.barcode || "",
      });
      setImagePreview(item.image_url || null);
      setDialogOpen(true);
    },
    [mainCategories],
  );

  const handleAddMainCategory = async (name: string) => {
    const normalizedName = String(name || "").trim();
    if (!normalizedName) {
      toast.error("Main category name is required");
      return null;
    }

    try {
      const response = await api.menu.createMainCategory({ name: normalizedName });
      const payload = (response as any)?.data;
      const created =
        payload?.data?.mainCategories?.[0] ||
        payload?.mainCategories?.[0] ||
        payload?.data ||
        payload;

      const slug = slugifyCategory(created?.slug || created?.name || normalizedName);
      if (!slug) return null;

      const category = {
        slug,
        name: String(created?.name || normalizedName).trim(),
      };

      setMainCategories((prev) => {
        if (prev.some((entry) => entry.slug === category.slug)) return prev;
        return [...prev, category];
      });

      setFormData((prev) => ({ ...prev, main_category: category.slug }));
      toast.success("Main category added");
      return category;
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to add main category");
      return null;
    }
  };

  const toggleAvailability = async (id: string) => {
    try {
      await api.menu.toggleAvailability(id);
      toast.success("Availability updated");
      setCurrentPage(1);
      fetchMenu();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((p) => ({ ...p, image_base64: reader.result as string }));
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceInt = parseInt(formData.price, 10);
    if (!Number.isFinite(priceInt)) {
      toast.error("Enter a valid price");
      return;
    }
    if (shouldShowSubCat && !formData.sub_category) {
      toast.error("Select a sub category");
      return;
    }
    const data = {
      ...formData,
      main_category:
        formData.main_category ||
        mainCategories[0]?.slug ||
        DEFAULT_FORM.main_category,
      category: shouldShowSubCat ? formData.sub_category : formData.category,
      price: priceInt,
      prep_time_minutes: formData.prep_time_minutes
        ? parseInt(formData.prep_time_minutes, 10)
        : 0,
      categories: [
        {
          name: shouldShowSubCat ? formData.sub_category : formData.category,
          slug: slugifyCategory(
            shouldShowSubCat ? formData.sub_category : formData.category,
          ),
          type: "main",
        },
        ...formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => ({
            name: tag,
            slug: slugifyCategory(tag),
            type: "tag",
          })),
      ],
    };
    try {
      if (selectedItem) {
        await api.menu.update(selectedItem.id, data);
        toast.success("Item updated");
      } else {
        await api.menu.create(data);
        toast.success("Item created");
      }
      setDialogOpen(false);
      setCurrentPage(1);
      fetchMenu();
    } catch {
      toast.error("Failed to save");
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm("Delete this menu item?")) return;
    try {
      await api.menu.delete(id);
      toast.success("Deleted");
      setCurrentPage(1);
      fetchMenu();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return {
    isAdmin,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    dialogOpen,
    setDialogOpen,
    selectedItem,
    formData,
    setFormData,
    imagePreview,
    syncStatus,
    handleManualSync,
    shouldShowSubCat,
    availableCategories,
    mainCategories,
    filteredItems,
    paginatedItems,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    openAdd,
    openEdit,
    toggleAvailability,
    handleImageChange,
    handleSubmit,
    handleAddMainCategory,
    deleteItem,
    fetchMenu,
    // Recipe state
    recipesMap,
    inventoryItems,
    stockLocations,
    saveRecipe,
    deleteRecipe,
  };
};

export default useMenuData;
