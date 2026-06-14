"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { waiterServices as api } from "@/lib/waiter/api";
import { useWaiterAuth } from "@/components/waiter/auth-context";
import { toast } from "sonner";
import { Clock, CheckCircle, AlertCircle, DollarSign } from "lucide-react";

export const useWaiterOrderHistory = () => {
  const { user, logout } = useWaiterAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [addingItemsOrderId, setAddingItemsOrderId] = useState<
    string | number | null
  >(null);
  const [addingItems, setAddingItems] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizeStatus = useCallback(
    (s: any) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .trim(),
    [],
  );

  const getEffectiveStatus = useCallback(
    (order: any) => {
      const pst = normalizeStatus(order?.payment_status);
      if (pst === "paid") return "paid";
      const st = normalizeStatus(order?.status);
      return st || "pending";
    },
    [normalizeStatus],
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push("/waiter/login");
  }, [logout, router]);

  const extractOrdersFromResponse = useCallback((response: any) => {
    const payload = response?.data;
    const candidates = [
      payload?.data?.orders,
      payload?.orders,
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

  // Fetch waiter's orders and menu items
  useEffect(() => {
    if (!user?.id) return;

    let isFirstLoad = true;

    const fetchData = async () => {
      if (isFirstLoad) {
        setLoading(true);
      }
      try {
        const [ordersResult, menuResult] = await Promise.allSettled([
          api.orders.getAll({
            employee_id: user.id,
            type: "cafe",
          }),
          api.menu.getCafeMenu(),
        ]);

        const ordersRaw =
          ordersResult?.status === "fulfilled"
            ? extractOrdersFromResponse(ordersResult.value)
            : [];
        const safeOrders = Array.isArray(ordersRaw) ? ordersRaw : [];

        const rawItems =
          menuResult?.status === "fulfilled"
            ? extractMenuItemsFromResponse(menuResult.value)
            : [];

        const normalizedItems = Array.isArray(rawItems)
          ? rawItems.map((item: any) => ({
              ...item,
              main_category: item.main_category || "restaurant",
              sub_category: item.sub_category || item.category || "",
              is_available:
                typeof item.is_available === "boolean"
                  ? item.is_available
                  : (item.available ?? true),
            }))
          : [];

        setOrders(safeOrders);
        setMenuItems(normalizedItems);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load order history");
      } finally {
        setLoading(false);
        isFirstLoad = false;
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000);
    return () => clearInterval(intervalId);
  }, [user?.id, extractOrdersFromResponse, extractMenuItemsFromResponse]);

  const getStatusDisplay = useCallback((status: string) => {
    const statusConfig: { [key: string]: any } = {
      pending: { icon: Clock, variant: "warning" as const, label: "Pending" },
      preparing: { icon: Clock, variant: "info" as const, label: "Preparing" },
      ready: { icon: CheckCircle, variant: "success" as const, label: "Ready" },
      paid: { icon: DollarSign, variant: "success" as const, label: "Paid" },
      completed: {
        icon: CheckCircle,
        variant: "secondary" as const,
        label: "Completed",
      },
      cancelled: {
        icon: AlertCircle,
        variant: "destructive" as const,
        label: "Cancelled",
      },
    };

    return statusConfig[status] || statusConfig.pending;
  }, []);

  const formatDate = useCallback((dateString: any) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  const canAddItems = useCallback(
    (order: any) => {
      const effectiveStatus = getEffectiveStatus(order);
      return ["pending", "preparing", "ready"].includes(effectiveStatus);
    },
    [getEffectiveStatus],
  );

  const startAddingItems = useCallback((order: any) => {
    setAddingItemsOrderId(order.id);
    setAddingItems([]);
  }, []);

  const cancelAddingItems = useCallback(() => {
    setAddingItemsOrderId(null);
    setAddingItems([]);
  }, []);

  const addMenuItemToOrder = useCallback((menuItem: any) => {
    setAddingItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) => item.menu_item_id === menuItem.id,
      );

      if (existingItemIndex >= 0) {
        const updatedItems = [...prev];
        updatedItems[existingItemIndex].quantity += 1;
        updatedItems[existingItemIndex].subtotal =
          parseFloat(updatedItems[existingItemIndex].unit_price) *
          updatedItems[existingItemIndex].quantity;
        return updatedItems;
      } else {
        const price = parseFloat(menuItem.price || 0);
        const mainCategory = menuItem.main_category || "restaurant";
        const newItem = {
          menu_item_id: menuItem.id,
          menu_item_name: menuItem.name,
          main_category: mainCategory,
          item_type: mainCategory,
          quantity: 1,
          unit_price: price,
          subtotal: price,
        };
        return [...prev, newItem];
      }
    });
  }, []);

  const updateAddingItemQuantity = useCallback(
    (index: number, newQuantity: number) => {
      if (newQuantity < 1) return;

      setAddingItems((prev) => {
        const updatedItems = [...prev];
        updatedItems[index].quantity = parseInt(newQuantity as any, 10);
        updatedItems[index].subtotal =
          parseFloat(updatedItems[index].unit_price || 0) *
          parseInt(newQuantity as any, 10);
        return updatedItems;
      });
    },
    [],
  );

  const removeAddingItem = useCallback((index: number) => {
    setAddingItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveAddedItems = useCallback(async () => {
    try {
      if (addingItems.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      if (addingItemsOrderId == null) return;

      const itemsData = {
        items: addingItems.map((item) => ({
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          main_category: item.main_category || item.item_type || "restaurant",
          item_type: item.item_type || item.main_category || "restaurant",
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        updated_by: user!.id,
      };

      await api.orders.addItems(addingItemsOrderId, itemsData);

      const currentOrder = orders.find((o) => o.id === addingItemsOrderId);
      if (currentOrder && normalizeStatus(currentOrder.status) === "ready") {
        await api.orders.updateStatus(addingItemsOrderId, {
          status: "preparing",
          updated_by: user!.id,
        });
      }

      toast.success("Items added to order successfully!");

      const ordersResult = await Promise.allSettled([
        api.orders.getAll({
          employee_id: user!.id,
          type: "cafe",
        }),
      ]);
      const ordersFetch = ordersResult?.[0];
      const refreshedOrdersRaw =
        ordersFetch?.status === "fulfilled"
          ? extractOrdersFromResponse(ordersFetch.value)
          : orders;
      const refreshedOrders = Array.isArray(refreshedOrdersRaw)
        ? refreshedOrdersRaw
        : [];

      setOrders(refreshedOrders);

      cancelAddingItems();
    } catch (error) {
      console.error("Error adding items:", error);
      toast.error("Failed to add items. Please try again.");
    }
  }, [
    addingItems,
    addingItemsOrderId,
    user,
    orders,
    normalizeStatus,
    cancelAddingItems,
    extractOrdersFromResponse,
  ]);

  const formatCurrency = useCallback((val: any) => {
    const n = parseFloat(val);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toLocaleString()} Birr`;
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Date filter matching "YYYY-MM-DD"
      if (selectedDate) {
        const orderDateStr = String(order.created_at || "").slice(0, 10);
        if (orderDateStr !== selectedDate) return false;
      }
      // Search filter matching Order ID or Table Number
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = String(order.id).includes(query);
        const matchesTable = String(order.table_number || "")
          .toLowerCase()
          .includes(query);
        if (!matchesId && !matchesTable) return false;
      }
      return true;
    });
  }, [orders, selectedDate, searchQuery]);

  const historyStats = useMemo(() => {
    let revenue = 0;
    const activeTables = new Set<string>();

    filteredOrders.forEach((order) => {
      const pst = normalizeStatus(order?.payment_status);
      const st = normalizeStatus(order?.status);
      if (pst === "paid" || st === "completed" || st === "ready") {
        revenue += parseFloat(order.total_amount || 0);
      }
      if (order.table_number) {
        activeTables.add(String(order.table_number));
      }
    });

    return {
      revenue: revenue.toFixed(2),
      activeTablesCount: activeTables.size,
      ordersCount: filteredOrders.length,
    };
  }, [filteredOrders, normalizeStatus]);

  return {
    loading,
    orders,
    filteredOrders,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    historyStats,
    addingItemsOrderId,
    addingItems,
    menuItems,
    getEffectiveStatus,
    getStatusDisplay,
    formatDate,
    canAddItems,
    startAddingItems,
    cancelAddingItems,
    addMenuItemToOrder,
    updateAddingItemQuantity,
    removeAddingItem,
    saveAddedItems,
    handleLogout,
    formatCurrency,
  };
};
