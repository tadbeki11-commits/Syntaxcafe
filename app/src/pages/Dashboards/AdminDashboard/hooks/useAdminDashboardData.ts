import { useState, useEffect } from "react";
import api from "@/application";
import { getApproximateServerDateString } from "@/shared/utils/serverTime";
import { DashboardData } from "../types";

const INITIAL_DATA: DashboardData = {
  stats: {
    totalUsers: 0,
    totalMenuItems: 0,
    todayOrders: 0,
    todayRevenue: 0,
    allTimeRevenue: 0,
    ordersTotal: 0,
    paidTotal: 0,
    unpaidTotal: 0,
    paidDeletedOrdersTotal: 0,
    activeEmployees: 0,
    totalTables: 0,
    occupiedTables: 0,
  },
  menuItems: [],
  allOrders: [],
  allPayments: [],
  recentOrders: [],
  recentPayments: [],
  todayAttendance: [],
  inventoryItems: [],
};

export const useAdminDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(INITIAL_DATA);


  const getPayloadArray = (result: any, field: string) => {
    if (result?.status !== "fulfilled") return null;
    
    const directData = result.value?.data?.data;
    if (Array.isArray(directData)) return directData;
    
    const nestedData =
      result.value?.data?.data?.[field] ?? result.value?.data?.[field];
    return Array.isArray(nestedData) ? nestedData : [];
  };


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all required data in parallel (partial success allowed)
        const [
          usersResult,
          menuResult,
          ordersResult,
          paymentsResult,
          attendanceResult,
          tablesResult,
          inventoryResult,
        ] = (await Promise.allSettled([
          api.users.getAll(),
          api.menu.getAll(),
          api.orders.getAll(),
          api.payments.getAll(),
          api.attendance.getTodayAttendance(),
          api.tables.getAll(),
          api.inventory.getAll(),
        ])) as any[];

        const usersData = getPayloadArray(usersResult, "users");
        const menuData = getPayloadArray(menuResult, "menuItems");
        const ordersData = getPayloadArray(ordersResult, "orders");
        const paymentsData = getPayloadArray(paymentsResult, "payments");
        const attendanceData = getPayloadArray(attendanceResult, "attendance");
        const tablesData = getPayloadArray(tablesResult, "tables");
        const inventoryData =
          getPayloadArray(inventoryResult, "inventory") ||
          getPayloadArray(inventoryResult, "items");

        // Process data and build new state
        setDashboardData((prev) => {
          const normalizeId = (v: any) => (v == null ? null : String(v));
          const isVoidedOrderStatus = (s: any) => {
            const st = String(s || "")
              .trim()
              .toLowerCase();
            return [
              "deleted",
              "cancelled",
              "canceled",
              "void",
              "voided",
            ].includes(st);
          };

          const isPaidPaymentStatus = (s: any) =>
            String(s || "")
              .trim()
              .toLowerCase() === "paid";

          const dedupePaidPaymentsByOrder = (payments: any) => {
            const list = Array.isArray(payments) ? payments : [];
            const byOrder = new Map();
            const standalone = [];

            for (const p of list as any[]) {
              const orderKey = normalizeId(p?.order_id);
              if (!orderKey) {
                standalone.push(p);
                continue;
              }

              const prevP = byOrder.get(orderKey);
              if (!prevP) {
                byOrder.set(orderKey, p);
                continue;
              }

              const prevTs = new Date(
                prevP?.created_at || prevP?.updated_at || 0,
              ).getTime();
              const nextTs = new Date(
                p?.created_at || p?.updated_at || 0,
              ).getTime();
              if (nextTs >= prevTs) byOrder.set(orderKey, p);
            }

            return [...byOrder.values(), ...standalone];
          };

          const today = getApproximateServerDateString();

          const allOrdersSafe = Array.isArray(ordersData) ? ordersData : null;
          const allPaymentsSafe = Array.isArray(paymentsData)
            ? paymentsData
            : null;

          const validOrders = Array.isArray(allOrdersSafe)
            ? allOrdersSafe.filter((o: any) => !isVoidedOrderStatus(o?.status))
            : null;

          const invalidOrderIdSet = Array.isArray(allOrdersSafe)
            ? new Set(
                allOrdersSafe
                  .filter((o: any) => isVoidedOrderStatus(o?.status))
                  .map((o: any) => normalizeId(o?.id))
                  .filter(Boolean),
              )
            : new Set();

          const paidPayments = Array.isArray(allPaymentsSafe)
            ? allPaymentsSafe
                .filter((p: any) => isPaidPaymentStatus(p?.status))
                .filter((p: any) => {
                  const oid = normalizeId(p?.order_id);
                  if (!oid) return true;
                  return !invalidOrderIdSet.has(oid);
                })
            : null;

          const paidPaymentsDeduped = Array.isArray(paidPayments)
            ? dedupePaidPaymentsByOrder(paidPayments)
            : null;

          const todayOrders = Array.isArray(validOrders)
            ? validOrders.filter((order: any) =>
                String(order?.created_at || "").startsWith(today),
              )
            : null;

          const todayPaidPayments = Array.isArray(paidPaymentsDeduped)
            ? paidPaymentsDeduped.filter((p: any) =>
                String(p?.created_at || "").startsWith(today),
              )
            : null;

          const todayRevenue = Array.isArray(todayPaidPayments)
            ? todayPaidPayments.reduce(
                (sum: number, payment: any) =>
                  sum + (parseFloat(payment?.amount || 0) || 0),
                0,
              )
            : prev.stats.todayRevenue;

          const ordersTotal = Array.isArray(validOrders)
            ? validOrders.reduce(
                (sum: number, order: any) =>
                  sum + (parseFloat(order?.total_amount || 0) || 0),
                0,
              )
            : prev.stats.ordersTotal;

          const paidTotal = Array.isArray(paidPaymentsDeduped)
            ? paidPaymentsDeduped.reduce(
                (sum: number, payment: any) =>
                  sum + (parseFloat(payment?.amount || 0) || 0),
                0,
              )
            : prev.stats.paidTotal;

          const paidOrderIdSet = Array.isArray(paidPaymentsDeduped)
            ? new Set(
                paidPaymentsDeduped
                  .map((p: any) => normalizeId(p?.order_id))
                  .filter(Boolean),
              )
            : new Set();

          const paidDeletedOrdersTotal = Array.isArray(allOrdersSafe)
            ? allOrdersSafe
                .filter((o: any) => {
                  const oid = normalizeId(o?.id);
                  const status = String(o?.status || "")
                    .trim()
                    .toLowerCase();
                  const paymentStatus = String(o?.payment_status || "")
                    .trim()
                    .toLowerCase();
                  if (isVoidedOrderStatus(status)) return true;
                  if (status === "paid" || paymentStatus === "paid")
                    return true;
                  if (oid && paidOrderIdSet.has(oid)) return true;
                  return false;
                })
                .reduce(
                  (sum: number, order: any) =>
                    sum + (parseFloat(order?.total_amount || 0) || 0),
                  0,
                )
            : prev.stats.paidDeletedOrdersTotal;

          const unpaidTotal = Array.isArray(validOrders)
            ? validOrders
                .filter((o: any) => {
                  const status = String(o?.status || "")
                    .trim()
                    .toLowerCase();
                  const paymentStatus = String(o?.payment_status || "")
                    .trim()
                    .toLowerCase();
                  if (status === "paid" || paymentStatus === "paid")
                    return false;
                  return !paidOrderIdSet.has(normalizeId(o?.id));
                })
                .reduce(
                  (sum: number, order: any) =>
                    sum + (parseFloat(order?.total_amount || 0) || 0),
                  0,
                )
            : prev.stats.unpaidTotal;

          const allTimeRevenue = paidTotal;

          const recentOrders = Array.isArray(validOrders)
            ? validOrders
                .slice()
                .sort(
                  (a: any, b: any) =>
                    new Date(b?.created_at || 0).getTime() -
                    new Date(a?.created_at || 0).getTime(),
                )
                .slice(0, 5)
            : prev.recentOrders;

          const recentPayments = Array.isArray(paidPayments)
            ? (Array.isArray(paidPaymentsDeduped)
                ? paidPaymentsDeduped
                : paidPayments
              )
                .slice()
                .sort(
                  (a: any, b: any) =>
                    new Date(b?.created_at || 0).getTime() -
                    new Date(a?.created_at || 0).getTime(),
                )
                .slice(0, 5)
            : prev.recentPayments;

          const next: DashboardData = {
            stats: {
              totalUsers: Array.isArray(usersData)
                ? usersData.length
                : prev.stats.totalUsers,
              totalMenuItems: Array.isArray(menuData)
                ? menuData.length
                : prev.stats.totalMenuItems,
              todayOrders: Array.isArray(todayOrders)
                ? todayOrders.length
                : prev.stats.todayOrders,
              todayRevenue,
              allTimeRevenue,
              ordersTotal,
              paidTotal,
              unpaidTotal,
              paidDeletedOrdersTotal,
              activeEmployees: Array.isArray(attendanceData) && attendanceData.length > 0
                ? attendanceData.length
                : (Array.isArray(usersData)
                  ? usersData.filter(
                      (u: any) =>
                        (u.is_active === 1 || u.is_active === true || u.is_active !== 0) &&
                        u.role !== "admin"
                    ).length
                  : prev.stats.activeEmployees),
              totalTables: Array.isArray(tablesData)
                ? tablesData.length
                : prev.stats.totalTables,
              occupiedTables: Array.isArray(tablesData)
                ? tablesData.filter((t) => t.status === "occupied").length
                : prev.stats.occupiedTables,
            },
            menuItems: Array.isArray(menuData) ? menuData : prev.menuItems,
            allOrders: Array.isArray(ordersData) ? ordersData : prev.allOrders,
            allPayments: Array.isArray(paymentsData)
              ? paymentsData
              : prev.allPayments,
            recentOrders,
            recentPayments,
            todayAttendance: Array.isArray(attendanceData)
              ? attendanceData
              : prev.todayAttendance,
            inventoryItems: Array.isArray(inventoryData)
              ? inventoryData
              : prev.inventoryItems,
          };


          return next;
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { loading, dashboardData };
};
