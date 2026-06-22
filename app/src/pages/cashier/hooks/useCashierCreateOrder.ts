import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/application";
import { SESSION_KEY } from "../CashierSelectWaiterForOrder";
import { syncEngine } from "@/infrastructure/sync/sync-engine";
import { useSyncRefetch } from "@/hooks/useSyncRefetch";
import { useAuth } from "@/context/AuthContext";

export const useCashierCreateOrder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() as any;

  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMainCategory, setSelectedMainCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [allTables, setAllTables] = useState<any[]>([]);
  const [forceTableSelection, setForceTableSelection] = useState(false);

  const submitLockRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);

  // Bumped when a sync cycle finishes so the menu/tables fetch effect re-runs
  // once background hydration / reconnect / manual sync lands fresh local data.
  const [reloadKey, setReloadKey] = useState(0);
  useSyncRefetch(() => setReloadKey((k) => k + 1));

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setIsOnline(status.online);
    });
    return () => unsubscribe();
  }, []);

  const slugifyCategory = useCallback((value: any) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }, []);

  const getItemCategories = useCallback(
    (item: any) => {
      const categories = Array.isArray(item?.categories) ? item.categories : [];
      if (categories.length > 0) return categories;
      const fallback =
        item?.meta?.main_category ||
        item?.main_category ||
        item?.category ||
        "cafe";
      return [
        { name: fallback, slug: slugifyCategory(fallback), type: "main" },
      ];
    },
    [slugifyCategory],
  );

  const itemHasCategory = useCallback(
    (item: any, category: string) => {
      if (category === "all") return true;
      const normalized = slugifyCategory(category);
      if (slugifyCategory(item.main_category) === normalized) return true;
      if (slugifyCategory(item.category) === normalized) return true;
      if (slugifyCategory(item.sub_category) === normalized) return true;

      return getItemCategories(item).some(
        (entry: any) =>
          slugifyCategory(entry.slug || entry.name) === normalized,
      );
    },
    [getItemCategories, slugifyCategory],
  );

  const isFastingCategory = useCallback((cat: any) => {
    return true;
  }, []);

  const getMainCategoryLabel = useCallback((cat: any) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }, []);

  const extractMenuItemsFromResponse = useCallback((response: any) => {
    const payload = response?.data;
    const candidates = [payload?.data?.menuItems];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    return [];
  }, []);

  const waiter = useMemo(() => {
    const fromState = location?.state?.waiter;
    if (fromState && fromState.id) return fromState;

    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  }, [location?.state?.waiter]);

  useEffect(() => {
    if (!waiter?.id) {
      toast.error("Please select a waiter first");
      navigate("/dashboard/cashier/select-waiter", { replace: true });
    }
  }, [navigate, waiter?.id]);

  useEffect(() => {
    const normalizeMenuItems = (rawItems: any[]) => {
      const normalizedItems = Array.isArray(rawItems)
        ? rawItems.map((item) => ({
            ...item,
            main_category: item.meta?.main_category || item.main_category,
            category: item.category,
            sub_category:
              item.meta?.sub_category ||
              item.sub_category ||
              item.category ||
              "",
            is_available:
              typeof item.is_available === "boolean"
                ? item.is_available
                : (item.available ?? true),
          }))
        : [];
      return normalizedItems.filter((item) => item.is_available);
    };

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [menuResult, tablesResult, settingsResult] =
          await Promise.allSettled([
            api.menu.getCafeMenu(),
            api.tables.getAll(),
            api.settings.getTableSelectionSettings(),
          ]);

        if (cancelled) return;

        let resolvedMenuItems: any[] = [];

        if (menuResult.status === "fulfilled") {
          const menuResponse = menuResult.value;
          const rawItems = extractMenuItemsFromResponse(menuResponse);
          resolvedMenuItems = normalizeMenuItems(rawItems);
        } else {
          console.error("Failed to fetch /api/menu/cafe:", menuResult.reason);
        }

        if (resolvedMenuItems.length === 0) {
          const fallbackMenuResult = await Promise.allSettled([
            api.menu.getAll(),
          ]);
          const allMenuAttempt = fallbackMenuResult[0];
          if (allMenuAttempt.status === "fulfilled") {
            const rawItems = extractMenuItemsFromResponse(allMenuAttempt.value);
            resolvedMenuItems = normalizeMenuItems(rawItems);
          } else {
            console.error(
              "Failed to fetch /api/menu fallback:",
              allMenuAttempt.reason,
            );
          }
        }

        if (!cancelled) {
          setMenuItems(resolvedMenuItems);
          setFilteredItems(resolvedMenuItems);
        }

        if (tablesResult.status === "fulfilled") {
          const allTablesResponse = (tablesResult as any).value;
          const tables = allTablesResponse?.data?.data?.tables ?? [];
          const tablesArray = Array.isArray(tables)
            ? tables.sort((a: any, b: any) => a.number - b.number)
            : [];
          setAllTables(tablesArray);
        }

        if (settingsResult.status === "fulfilled") {
          setForceTableSelection(
            Boolean((settingsResult.value as any)?.force_table_selection),
          );
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load menu items or table status");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [isFastingCategory, extractMenuItemsFromResponse, reloadKey]);

  useEffect(() => {
    const searchTerm = searchQuery.trim().toLowerCase();
    const mainFiltered =
      selectedMainCategory === "all"
        ? menuItems
        : menuItems.filter((item) =>
            itemHasCategory(item, selectedMainCategory),
          );

    const matchesSearch = (item: any) => {
      if (!searchTerm) return true;
      const haystack = [
        item.name,
        item.category,
        item.sub_category,
        item.main_category,
        item.sku,
        item.barcode,
        ...getItemCategories(item).flatMap((category: any) => [
          category.name,
          category.slug,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    };

    const searchableItems = mainFiltered.filter(matchesSearch);

    if (selectedCategory === "all") {
      setFilteredItems(searchableItems);
    } else {
      setFilteredItems(
        searchableItems.filter(
          (item) => (item.category || item.sub_category) === selectedCategory,
        ),
      );
    }
  }, [
    selectedCategory,
    selectedMainCategory,
    searchQuery,
    menuItems,
    getItemCategories,
    itemHasCategory,
    isFastingCategory,
  ]);

  useEffect(() => {
    setSelectedCategory("all");
  }, [selectedMainCategory]);

  const getMainCategories = useCallback(() => {
    const seen = new Set<string>();
    const categories: string[] = [];

    menuItems.forEach((item) => {
      const mainCategory =
        item.main_category ||
        getItemCategories(item).find(
          (category: any) => category.type === "main",
        )?.slug ||
        item.category;
      if (!mainCategory || seen.has(mainCategory)) return;
      seen.add(mainCategory);
      categories.push(mainCategory);
    });

    return categories;
  }, [getItemCategories, menuItems]);

  const getCategories = useCallback(() => {
    const seen = new Set<string>();
    const categories: string[] = [];

    menuItems.forEach((item) => {
      if (selectedMainCategory !== "all") {
        if (
          !itemHasCategory(item, selectedMainCategory) &&
          item.main_category !== selectedMainCategory
        ) {
          return;
        }
      }

      const sub = item.category || item.sub_category;
      if (sub && !seen.has(sub)) {
        seen.add(sub);
        categories.push(sub);
      }
    });

    return categories;
  }, [selectedMainCategory, menuItems, itemHasCategory]);

  const addToOrder = useCallback(
    (menuItem: any) => {
      const existingItem = orderItems.find(
        (item) => item.menu_item_id === menuItem.id,
      );

      if (existingItem) {
        setOrderItems((prev) =>
          prev.map((item) =>
            item.menu_item_id === menuItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      } else {
        setOrderItems((prev) => [
          ...prev,
          {
            menu_item_id: menuItem.id,
            menu_item_name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            main_category: menuItem.main_category,
            predefined_notes: Array.isArray(menuItem.predefined_notes)
              ? menuItem.predefined_notes
              : Array.isArray(menuItem?.meta?.predefined_notes)
                ? menuItem.meta.predefined_notes
                : [],
          },
        ]);
      }

      toast.success("Added to order", {
        id: "cashier-add-to-order",
        duration: 2000,
      });
    },
    [orderItems],
  );

  const removeFromOrder = useCallback((menuItemId: any) => {
    setOrderItems((prev) =>
      prev.filter((item) => item.menu_item_id !== menuItemId),
    );
  }, []);

  const updateQuantity = useCallback((menuItemId: any, change: number) => {
    setOrderItems((prev) =>
      prev
        .map((item) => {
          if (item.menu_item_id === menuItemId) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const updateItemNote = useCallback((menuItemId: any, note: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.menu_item_id === menuItemId ? { ...item, note } : item,
      ),
    );
  }, []);

  const calculateTotal = useCallback(() => {
    return orderItems
      .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2);
  }, [orderItems]);

  // const beverageCategories = useMemo( () => [], [],);

  const handleSubmitOrder = useCallback(async () => {
    if (submitLockRef.current) return;
    if (creatingOrder) return;
    submitLockRef.current = true;

    try {
      setCreatingOrder(true);

      if (!waiter?.id) {
        toast.error("Please select a waiter first");
        return;
      }

      if (orderItems.length === 0) {
        toast.error("Please add at least one item to the order");
        return;
      }

      const orderData: any = {
        employee_id: waiter.id,
        waiter_id: waiter.id,
        created_by_id: user?.id ? user.id : waiter.id,
        type: "cafe",
        items: orderItems.map((item) => {
          const unitPrice = parseFloat(item.price);
          const quantity = parseInt(item.quantity, 10);

          return {
            menu_item_id: item.menu_item_id,
            menu_item_name: item.menu_item_name,
            quantity,
            unit_price: unitPrice,
            subtotal: unitPrice * quantity,
            main_category: item.main_category || "cafe",
            item_type: item.main_category || "cafe",
            note: item.note?.trim() || undefined,
          };
        }),
        total_amount: parseFloat(calculateTotal()),
        notes: notes.trim() || undefined,
      };

      const isTableSelected =
        selectedTable &&
        (selectedTable === "takeaway" || selectedTable === "beu");

      if (forceTableSelection && !isTableSelected) {
        toast.error("Table selection is mandatory.");
        return;
      }

      // When enforcement is off, no selection defaults to Take Away.
      const effectiveTable = selectedTable || "takeaway";

      orderData.order_type_label =
        effectiveTable === "takeaway"
          ? "Take Away"
          : effectiveTable === "beu"
            ? "Beu"
            : `Table ${effectiveTable}`;

      if (effectiveTable !== "takeaway" && effectiveTable !== "beu") {
        orderData.table_number = parseInt(effectiveTable, 10);
      }

      await api.orders.createCafe(orderData);
      toast.success("Order created successfully!");

      setSelectedTable("");
      setOrderItems([]);
      setNotes("");
      navigate("/dashboard");
    } catch (e: any) {
      console.error("Create order error:", e);
      if (e?.response?.status === 409) {
        toast.error(e?.response?.data?.message || "Not enough inventory");
      } else {
        toast.error("Failed to create order");
      }
    } finally {
      setCreatingOrder(false);
      submitLockRef.current = false;
    }
  }, [
    calculateTotal,
    creatingOrder,
    navigate,
    orderItems,
    notes,
    selectedTable,
    waiter?.id,
    user?.id,
    forceTableSelection,
  ]);

  const waiterName = waiter?.full_name || waiter?.name || waiter?.username;

  const mappedMainCategories = useMemo(() => {
    return getMainCategories().map((c) => ({
      id: c,
      label: getMainCategoryLabel(c),
      count: menuItems.filter(
        (item) => itemHasCategory(item, c) || item.main_category === c,
      ).length,
    }));
  }, [getMainCategories, getMainCategoryLabel, itemHasCategory, menuItems]);

  const mappedSubCategories = useMemo(() => {
    return getCategories().map((c) => ({
      id: c,
      label: c,
      count: menuItems
        .filter(
          (item) =>
            itemHasCategory(item, selectedMainCategory) ||
            item.main_category === selectedMainCategory,
        )
        .filter((item) => (item.category || item.sub_category) === c).length,
    }));
  }, [getCategories, itemHasCategory, menuItems, selectedMainCategory]);

  const mainFilteredCount = useMemo(() => {
    return menuItems.filter(
      (item) =>
        itemHasCategory(item, selectedMainCategory) ||
        item.main_category === selectedMainCategory,
    ).length;
  }, [itemHasCategory, menuItems, selectedMainCategory]);

  return {
    loading,
    menuItems,
    filteredItems,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedMainCategory,
    setSelectedMainCategory,
    creatingOrder,
    selectedTable,
    setSelectedTable,
    orderItems,
    notes,
    setNotes,
    allTables,
    isOnline,
    waiter,
    waiterName,
    mappedMainCategories,
    mappedSubCategories,
    mainFilteredCount,
    isFastingCategory,
    addToOrder,
    removeFromOrder,
    updateQuantity,
    updateItemNote,
    calculateTotal,
    handleSubmitOrder,
    forceTableSelection,
  };
};
