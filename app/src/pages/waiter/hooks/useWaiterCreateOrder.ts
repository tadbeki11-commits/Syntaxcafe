import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/application";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { syncEngine } from "@/infrastructure/sync/sync-engine";

export const useWaiterCreateOrder = () => {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMainCategory, setSelectedMainCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [allTables, setAllTables] = useState<any[]>([]);
  const [forceTableSelection, setForceTableSelection] = useState(false);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  const submitLockRef = useRef(false);

  const [syncStatus, setSyncStatus] = useState({
    online: syncEngine.isAppOnline(),
    syncing: syncEngine.isSyncingInProgress(),
    unsyncedCount: 0,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const normalizeMainCategory = useCallback((value: any) => {
    const v = String(value || "")
      .trim()
      .toLowerCase();
    return v || "other";
  }, []);

  const extractMenuItemsFromResponse = useCallback((response: any) => {
    const payload = response?.data;
    const candidates = [
      payload?.data?.menuItems,
      payload?.menuItems,
      payload?.data?.items,
      payload?.items,
      payload?.data,
      payload,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    return [];
  }, []);

  const fetchData = useCallback(async () => {
    const normalizeMenuItems = (rawItems: any[]) => {
      const normalizedItems = Array.isArray(rawItems)
        ? rawItems.map((item) => ({
            ...item,
            main_category:
              item.meta?.main_category ||
              item.main_category ||
              normalizeMainCategory(item.category),
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

    try {
      setLoading(true);

      const [menuResult, tablesResult, settingsResult] = await Promise.allSettled([
        api.menu.getCafeMenu(),
        api.tables.getAll(),
        api.settings.getTableSelectionSettings(),
      ]);

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

      setMenuItems(resolvedMenuItems);
      setFilteredItems(resolvedMenuItems);

      if (tablesResult.status === "fulfilled") {
        const allTablesResponse = tablesResult.value as any;
        const tables = allTablesResponse?.data?.data?.tables ?? [];
        const tablesArray = Array.isArray(tables)
          ? tables.sort((a, b) => a.number - b.number)
          : [];
        setAllTables(tablesArray);
      }

      if (settingsResult.status === "fulfilled") {
        setForceTableSelection(Boolean((settingsResult.value as any)?.force_table_selection));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load menu items or table status");
    } finally {
      setLoading(false);
    }
  }, [normalizeMainCategory, extractMenuItemsFromResponse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualSync = useCallback(async () => {
    if (syncStatus.syncing) return;
    if (!syncStatus.online) {
      toast.error("App is offline. Cannot sync.");
      return;
    }

    toast.loading("Synchronizing menu...", { id: "waiter-sync" });
    const success = await syncEngine.sync();
    toast.dismiss("waiter-sync");

    if (success) {
      toast.success("Menu updated successfully!");
      // Re-fetch local data after sync
      fetchData();
    } else {
      toast.error("Failed to sync. Please try again.");
    }
  }, [syncStatus.syncing, syncStatus.online, fetchData]);

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
          slugifyCategory(entry.slug || entry.name) === normalized ||
          normalizeMainCategory(entry.name) === normalizeMainCategory(category),
      );
    },
    [getItemCategories, normalizeMainCategory, slugifyCategory],
  );

  const isFastingCategory = useCallback((cat: any) => {
    return true;
  }, []);

  const getMainCategoryLabel = useCallback(
    (cat: any) => {
      const v = normalizeMainCategory(cat);
      if (v === "cafe") return "Cafe";
      if (v === "barista") return "Barista";
      return v.charAt(0).toUpperCase() + v.slice(1);
    },
    [normalizeMainCategory],
  );

  // Filter items by category
  useEffect(() => {
    const searchTerm = searchQuery.trim().toLowerCase();
    const mainFiltered =
      selectedMainCategory === "all"
        ? menuItems
        : menuItems.filter(
            (item) =>
              itemHasCategory(item, selectedMainCategory) ||
              normalizeMainCategory(item.main_category) ===
                selectedMainCategory,
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
    normalizeMainCategory,
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
      const category = normalizeMainCategory(mainCategory);
      if (!category || seen.has(category)) return;
      seen.add(category);
      categories.push(category);
    });

    return categories;
  }, [getItemCategories, menuItems, normalizeMainCategory]);

  const getCategories = useCallback(() => {
    const seen = new Set<string>();
    const categories: string[] = [];

    menuItems.forEach((item) => {
      if (selectedMainCategory !== "all") {
        if (
          !itemHasCategory(item, selectedMainCategory) &&
          normalizeMainCategory(item.main_category) !== selectedMainCategory
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
  }, [selectedMainCategory, menuItems, itemHasCategory, normalizeMainCategory]);

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
            main_category: menuItem.main_category || "barista",
            quantity: 1,
          },
        ]);
      }

      toast.success("Added to Cart", {
        id: "waiter-add-to-order",
        duration: 1000,
        icon: "🛒",
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

  const calculateTotal = useCallback(() => {
    return orderItems
      .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2);
  }, [orderItems]);

  const beverageCategories = useMemo(
    () => [
      "coffee",
      "beverages",
      "drinks",
      "tea",
      "espresso",
      "cappuccino",
      "latte",
      "americano",
      "cold drinks",
      "hot drinks",
      "iced coffee",
      "frappuccino",
      "smoothie",
      "juice",
      "soda",
      "water",
    ],
    [],
  );

  const categorizeOrderItems = useCallback(() => {
    const beverageItems: any[] = [];
    const foodItems: any[] = [];

    orderItems.forEach((item) => {
      const isBeverage = item.main_category === "barista";

      if (isBeverage) {
        beverageItems.push(item);
      } else {
        foodItems.push(item);
      }
    });

    return { beverageItems, foodItems };
  }, [orderItems]);

  const getOrderRoutingInfo = useCallback(() => {
    if (orderItems.length === 0) return null;

    const { beverageItems, foodItems } = categorizeOrderItems();

    if (foodItems.length === 0) {
      return {
        type: "beverage_only",
        message: "Beverages only - Stream directly to Cashier register",
        icon: "☕",
        color: "text-info bg-info/10 border-info/20",
      };
    } else if (beverageItems.length === 0) {
      return {
        type: "food_only",
        message: "Food items only - Stream to Kitchen board first",
        icon: "🍽️",
        color: "text-orange-600 bg-orange-500/10 border-orange-500/20",
      };
    } else {
      return {
        type: "mixed",
        message: `Mixed order - Beverages (${beverageItems.length}) will coordinate with Kitchen food cooking release`,
        icon: "🔄",
        color: "text-primary bg-primary/10 border-primary/20",
      };
    }
  }, [orderItems.length, categorizeOrderItems]);

  const handleSubmitOrder = useCallback(async () => {
    if (submitLockRef.current) return;
    if (creatingOrder) return;
    submitLockRef.current = true;

    try {
      setCreatingOrder(true);

      if (orderItems.length === 0) {
        toast.error("Please add at least one item to the order");
        return;
      }

      const isTableSelected =
        selectedTable &&
        selectedTable !== "takeaway" &&
        selectedTable !== "beu";

      if (forceTableSelection && !isTableSelected) {
        toast.error("Table selection is mandatory. Take Away and Beu are not allowed.");
        return;
      }

      // When enforcement is off, no selection defaults to Take Away.
      const effectiveTable = selectedTable || "takeaway";

      const orderData: any = {
        employee_id: user.id,
        waiter_id: user.id,
        created_by_id: user.id,
        type: "cafe",
        order_type_label:
          effectiveTable === "takeaway"
            ? "Take Away"
            : effectiveTable === "beu"
              ? "Beu"
              : `Table ${effectiveTable}`,
        items: orderItems.map((item) => {
          const unitPrice = parseFloat(item.price);
          const quantity = parseInt(item.quantity, 10);
          const isBeverage = item.main_category === "barista";
          return {
            menu_item_id: item.menu_item_id,
            menu_item_name: item.menu_item_name,
            quantity: quantity,
            unit_price: unitPrice,
            subtotal: unitPrice * quantity,
            main_category: item.main_category || "barista",
            item_type: isBeverage ? "beverage" : "food",
          };
        }),
        total_amount: parseFloat(calculateTotal()),
      };

      if (effectiveTable !== "takeaway" && effectiveTable !== "beu") {
        orderData.table_number = parseInt(effectiveTable, 10);
      }

      await api.orders.createCafe(orderData);
      toast.success("Order created successfully!");

      await logout();
      navigate("/login");

      setSelectedTable("");
      setOrderItems([]);
    } finally {
      setCreatingOrder(false);
      submitLockRef.current = false;
    }
  }, [
    creatingOrder,
    orderItems,
    selectedTable,
    user?.id,
    calculateTotal,
    logout,
    navigate,
    forceTableSelection,
  ]);

  const formatCurrency = useCallback((val: any) => {
    const n = parseFloat(val);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toLocaleString()} Birr`;
  }, []);

  const waiterName =
    user?.full_name || user?.name || user?.username || "Waiter";

  const mappedMainCategories = useMemo(() => {
    return getMainCategories().map((c) => ({
      id: c,
      label: getMainCategoryLabel(c),
      count: menuItems.filter(
        (item) =>
          itemHasCategory(item, c) ||
          normalizeMainCategory(item.main_category) === c,
      ).length,
    }));
  }, [
    getMainCategories,
    getMainCategoryLabel,
    menuItems,
    itemHasCategory,
    normalizeMainCategory,
  ]);

  const mappedSubCategories = useMemo(() => {
    return getCategories().map((c) => ({
      id: c,
      label: c,
      count: menuItems
        .filter(
          (item) =>
            itemHasCategory(item, selectedMainCategory) ||
            normalizeMainCategory(item.main_category) === selectedMainCategory,
        )
        .filter((item) => (item.category || item.sub_category) === c).length,
    }));
  }, [
    getCategories,
    itemHasCategory,
    menuItems,
    selectedMainCategory,
    normalizeMainCategory,
  ]);

  const mainFilteredCount = useMemo(() => {
    return menuItems.filter(
      (item) =>
        itemHasCategory(item, selectedMainCategory) ||
        normalizeMainCategory(item.main_category) === selectedMainCategory,
    ).length;
  }, [itemHasCategory, menuItems, selectedMainCategory, normalizeMainCategory]);

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
    allTables,
    isMobileSummaryOpen,
    setIsMobileSummaryOpen,
    waiterName,
    mappedMainCategories,
    mappedSubCategories,
    mainFilteredCount,
    isFastingCategory,
    addToOrder,
    removeFromOrder,
    updateQuantity,
    calculateTotal,
    getOrderRoutingInfo,
    handleSubmitOrder,
    handleLogout,
    formatCurrency,
    syncStatus,
    handleManualSync,
    forceTableSelection,
  };
};
