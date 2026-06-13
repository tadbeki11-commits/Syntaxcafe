import { useState, useEffect } from "react";
import api from "@/application";
import { getApproximateServerDate } from "@/shared/utils/serverTime";

export const useWaiterData = (userId?: string | number) => {
  const [loading, setLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>({
    cafeMenu: [],
    myOrders: [],
    todayStats: {
      ordersCreated: 0,
      ordersServed: 0,
      totalRevenue: 0,
      pendingBalance: 0,
    },
  });

  const normalizeStatus = (s: any) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .trim();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [menuResult, myOrdersResult, attendanceResult] =
          (await Promise.allSettled([
            api.menu.getCafeMenu(),
            api.orders.getAll({ type: "cafe", employee_id: userId }),
            api.attendance.getCurrentStatus(userId),
          ])) as any[];

        const ordersRaw =
          myOrdersResult?.status === "fulfilled"
            ? (myOrdersResult.value?.data?.data?.orders ??
              myOrdersResult.value?.data?.orders ??
              [])
            : [];
        const orders = Array.isArray(ordersRaw) ? ordersRaw : [];

        const now = getApproximateServerDate();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0,
        );
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

        const todayOrders = orders.filter((order) => {
          const d = new Date(order.created_at);
          if (Number.isNaN(d.getTime())) return false;
          return d >= startOfDay && d <= endOfDay;
        });

        const todayServed = todayOrders.filter((order) => {
          const st = normalizeStatus(order.status);
          const pst = normalizeStatus(order.payment_status);
          return ["completed", "paid"].includes(st) || pst === "paid";
        });
        const todayRevenue = todayServed.reduce(
          (sum: number, order: any) =>
            sum + (parseFloat(order.total_amount) || 0),
          0,
        );

        const menuItemsRaw =
          menuResult?.status === "fulfilled"
            ? (menuResult.value?.data?.data?.menuItems ??
              menuResult.value?.data?.menuItems ??
              [])
            : [];
        const menuItems = Array.isArray(menuItemsRaw) ? menuItemsRaw : [];

        setDashboardData({
          cafeMenu: menuItems,
          myOrders: orders,
          todayStats: {
            ordersCreated: todayOrders.length,
            ordersServed: todayServed.length,
            totalRevenue: todayRevenue,
            pendingBalance: 0,
          },
        });

        if (attendanceResult?.status === "fulfilled") {
          setAttendanceStatus(
            attendanceResult.value?.data?.data?.currentStatus || null,
          );
        }
      } catch (error) {
        console.error("Error fetching waiter dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000);
    return () => clearInterval(intervalId);
  }, [userId]);

  const handleClockIn = async () => {
    try {
      await api.attendance.clockIn({ user_id: userId });
      const response = (await api.attendance.getCurrentStatus(userId)) as any;
      setAttendanceStatus(response.data.data.currentStatus);
      return true;
    } catch (error) {
      console.error("Clock in error:", error);
      return false;
    }
  };

  const handleClockOut = async () => {
    try {
      await api.attendance.clockOut({ user_id: userId });
      setAttendanceStatus(null);
      return true;
    } catch (error) {
      console.error("Clock out error:", error);
      return false;
    }
  };

  return {
    loading,
    dashboardData,
    attendanceStatus,
    handleClockIn,
    handleClockOut,
  };
};
