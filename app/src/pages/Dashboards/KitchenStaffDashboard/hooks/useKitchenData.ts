import { useState, useEffect } from "react";
import api from "@/application";
import {
  getApproximateServerDateString,
  getApproximateServerNow,
} from "@/shared/utils/serverTime";

const KITCHEN_DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;
const KITCHEN_MENU_CACHE_KEY = "kitchen_menu_v1";

export const useKitchenData = (userId?: string | number) => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    kitchenOrders: [],
    preparingOrders: [],
    readyOrders: [],
    todayStats: {
      ordersReceived: 0,
      ordersCompleted: 0,
      averageTime: 0,
    },
  });
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const filterPreparingOrdersForKitchen = (allOrders: any) => {
    return allOrders
      .filter((order: any) => order.status === "preparing")
      .filter((order: any) => {
        return (
          order.items &&
          order.items.some((item: any) => item.item_type === "food")
        );
      })
      .map((order: any) => ({
        ...order,
        items: order.items.filter((item: any) => item.item_type === "food"),
      }));
  };

  const filterMenuItemsForKitchen = (menuItems: any) => {
    return (Array.isArray(menuItems) ? menuItems : [])
      .filter((item) => item.is_available)
      .filter((item) => (item.main_category || "") === "restaurant");
  };

  // Fetch dashboard data
  useEffect(() => {
    const DASHBOARD_CACHE_KEY = `kitchen_dashboard_${userId}_v1`;

    const loadCache = (key: any) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Number.isFinite(parsed.ts)) return null;
        const now = getApproximateServerNow();
        if (now - parsed.ts > KITCHEN_DASHBOARD_CACHE_TTL_MS)
          return null;
        return parsed.data || null;
      } catch {
        return null;
      }
    };

    const saveCache = (key: any, data: any) => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ ts: getApproximateServerNow(), data }),
        );
      } catch {
        // ignore cache write failures
      }
    };

    const fetchData = async () => {
      try {
        const cached = loadCache(DASHBOARD_CACHE_KEY);
        if (cached) {
          setDashboardData((prev: any) => ({
            ...prev,
            kitchenOrders: Array.isArray(cached.kitchenOrders)
              ? cached.kitchenOrders
              : [],
            preparingOrders: Array.isArray(cached.preparingOrders)
              ? cached.preparingOrders
              : [],
            readyOrders: Array.isArray(cached.readyOrders)
              ? cached.readyOrders
              : [],
            todayStats: cached.todayStats || prev.todayStats,
          }));
          setLoading(false);
        } else {
          setLoading(true);
        }

        const [kitchenOrdersResult, allOrdersResult] =
          (await Promise.allSettled([
            api.orders.getKitchenOrders(),
            api.orders.getAll({ type: "cafe" }),
          ])) as any[];

        let nextCachePayload: any = null;
        setDashboardData((prev: any) => {
          const allOrdersRaw =
            allOrdersResult?.status === "fulfilled"
              ? (allOrdersResult.value?.data?.data?.orders ??
                allOrdersResult.value?.data?.orders ??
                [])
              : prev.preparingOrders.concat(prev.readyOrders);

          const kitchenOrdersRaw =
            kitchenOrdersResult?.status === "fulfilled"
              ? (kitchenOrdersResult.value?.data?.data?.orders ??
                kitchenOrdersResult.value?.data?.orders ??
                prev.kitchenOrders)
              : prev.kitchenOrders;

          const allOrders = Array.isArray(allOrdersRaw) ? allOrdersRaw : [];
          const kitchenOrders = Array.isArray(kitchenOrdersRaw)
            ? kitchenOrdersRaw
            : [];
          const preparingOrders = filterPreparingOrdersForKitchen(allOrders);
          const readyOrders = allOrders.filter(
            (order) => order.status === "ready",
          );

          const today = getApproximateServerDateString();
          const todayOrders = allOrders.filter((order) =>
            String(order?.created_at || "").startsWith(today),
          );
          const todayCompleted = todayOrders.filter(
            (order) => order.status === "ready" || order.status === "completed",
          );

          const next = {
            ...prev,
            kitchenOrders,
            preparingOrders,
            readyOrders,
            todayStats: {
              ordersReceived: todayOrders.length,
              ordersCompleted: todayCompleted.length,
              averageTime: 15,
            },
          };

          nextCachePayload = {
            kitchenOrders: next.kitchenOrders,
            preparingOrders: next.preparingOrders,
            readyOrders: next.readyOrders,
            todayStats: next.todayStats,
          };

          return next;
        });

        if (nextCachePayload) {
          saveCache(DASHBOARD_CACHE_KEY, nextCachePayload);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Fetch menu items
  useEffect(() => {
    const loadMenuCache = () => {
      try {
        const raw = localStorage.getItem(KITCHEN_MENU_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Number.isFinite(parsed.ts)) return null;
        const now = getApproximateServerNow();
        if (now - parsed.ts > KITCHEN_DASHBOARD_CACHE_TTL_MS)
          return null;
        return Array.isArray(parsed.data) ? parsed.data : null;
      } catch {
        return null;
      }
    };

    const saveMenuCache = (menu: any) => {
      try {
        localStorage.setItem(
          KITCHEN_MENU_CACHE_KEY,
          JSON.stringify({ ts: getApproximateServerNow(), data: menu }),
        );
      } catch {
        // ignore cache write failures
      }
    };

    const fetchMenuItems = async () => {
      try {
        const cached = loadMenuCache();
        if (cached) {
          setMenuItems(cached);
        }

        const response = (await api.menu.getCafeMenu()) as any;
        const raw = response.data.data.menuItems || [];
        const normalized = Array.isArray(raw)
          ? raw.map((item) => ({
              ...item,
              main_category: item.main_category || "restaurant",
              sub_category: item.sub_category || item.category || "",
              is_available:
                typeof item.is_available === "boolean"
                  ? item.is_available
                  : (item.available ?? true),
            }))
          : [];
        setMenuItems(normalized);
        saveMenuCache(normalized);
      } catch (error) {
        console.error("Error fetching menu items:", error);
      }
    };

    fetchMenuItems();
  }, []);

  return {
    loading,
    dashboardData,
    setDashboardData,
    menuItems,
    filterPreparingOrdersForKitchen,
    filterMenuItemsForKitchen,
  };
};
