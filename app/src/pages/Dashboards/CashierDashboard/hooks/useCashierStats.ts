import { useState, useCallback, useMemo } from "react";
import {
  getApproximateServerDate,
  getApproximateServerDateString,
} from "@/shared/utils/serverTime";

interface StatsProps {
  paymentsAll: any[];
  ordersForPayment: any[];
  user: any;
  menuItems: any[];
  menuMainCategoryById: Record<number, string>;
  orderDetailsById: Record<number, any>;
}

export const useCashierStats = ({
  paymentsAll,
  ordersForPayment,
  user,
  menuItems,
  menuMainCategoryById,
  orderDetailsById,
}: StatsProps) => {
  const resolvePaymentOrderId = useCallback((payment: any) => {
    const directOrderId =
      payment?.order_id != null ? payment.order_id : null;
    if (directOrderId != null && directOrderId !== "") return directOrderId;

    const nestedOrderId = payment?.order?.id != null ? payment.order.id : null;
    if (nestedOrderId != null && nestedOrderId !== "") return nestedOrderId;

    const metaOrderId =
      payment?.meta?.orderId != null ? payment.meta.orderId : null;
    if (metaOrderId != null && metaOrderId !== "") return metaOrderId;

    const metaOrderIdAlt =
      payment?.meta?.order_id != null ? payment.meta.order_id : null;
    if (metaOrderIdAlt != null && metaOrderIdAlt !== "") return metaOrderIdAlt;

    return null;
  }, []);

  const [statsRange, setStatsRange] = useState("today");
  const [customStatsDate, setCustomStatsDate] = useState(
    () => getApproximateServerDateString(),
  );
  const [businessUnit, setBusinessUnit] = useState("all");
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("all");
  const [tableNumberFilter, setTableNumberFilter] = useState("");

  const formatCurrency = useCallback((val: any) => {
    const n = parseFloat(val);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toLocaleString()} Birr`;
  }, []);

  const getDateBoundsForStatsRange = useCallback(() => {
    const now = getApproximateServerDate();
    let from = null;
    let to = null;

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    const parseYmdAsLocalDate = (ymd: any) => {
      if (!ymd || typeof ymd !== "string") return null;
      const parts = ymd.split("-");
      if (parts.length !== 3) return null;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
        return null;
      const dt = new Date(y, m - 1, d);
      if (Number.isNaN(dt.getTime())) return null;
      return dt;
    };

    if (statsRange === "today") {
      from = startOfDay(now);
      to = endOfDay(now);
    } else if (statsRange === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      to = endOfDay(y);
    } else if (statsRange === "week") {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(monday.getDate() - diffToMonday);
      from = startOfDay(monday);
      to = endOfDay(now);
    } else if (statsRange === "month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      from = startOfDay(first);
      to = endOfDay(now);
    } else if (statsRange === "custom") {
      const d = parseYmdAsLocalDate(customStatsDate);
      if (!d) return { from: null, to: null };
      from = startOfDay(d);
      to = endOfDay(d);
    }

    return { from, to };
  }, [statsRange, customStatsDate]);

  const getItemDepartment = useCallback(
    (item: any) => {
      const explicitType = String(item?.item_type || "")
        .trim()
        .toLowerCase();
    

      const explicitMain = String(item?.main_category || "")
        .trim()
        .toLowerCase();
      
      return explicitMain;
    },
    [menuMainCategoryById],
  );

  const getMenuItemDepartment = useCallback((menuItem: any) => {
    const explicitMain = String(menuItem?.main_category || "")
      .trim()
      .toLowerCase();
   
      return explicitMain;

  }, []);

  const menuItemsForSelectedUnit = useMemo(() => {
    if (businessUnit === "all") return [];
    const list = Array.isArray(menuItems) ? menuItems : [];
    return list
      .filter((it) => getMenuItemDepartment(it) === businessUnit)
      .slice()
      .sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || "")),
      );
  }, [businessUnit, getMenuItemDepartment, menuItems]);

  const getItemSubtotalBirr = useCallback((item: any) => {
    const qty = parseInt(item?.quantity, 10) || 0;
    const subtotal = parseFloat(item?.subtotal);
    if (Number.isFinite(subtotal)) return subtotal;

    const unitPrice = parseFloat(item?.unit_price);
    if (Number.isFinite(unitPrice) && qty > 0) return unitPrice * qty;

    const price = parseFloat(item?.price);
    if (Number.isFinite(price) && qty > 0) return price * qty;

    return 0;
  }, []);

  const getOrderUnitBreakdown = useCallback(
    (order: any, unit: any) => {
      if (!order) return { items: [], subtotal: 0 };

      const details = order?.id
        ? orderDetailsById?.[order.id as any] || null
        : null;
      const itemsRaw =
        details?.items &&
        Array.isArray(details.items) &&
        details.items.length > 0
          ? details.items
          : Array.isArray(order?.items)
            ? order.items
            : [];

      const orderFallback = String(order?.type || "")
        .trim()
        .toLowerCase();
      const fallbackDept =
        orderFallback === "bakery" ? "cafe" : orderFallback || null;

      const items = [];
      let subtotal = 0;

      for (const it of itemsRaw) {
        const dept = getItemDepartment(it) || fallbackDept;
        if (unit && dept !== unit) continue;
        const line = getItemSubtotalBirr(it);
        if (line > 0) subtotal += line;
        items.push(it);
      }

      return { items, subtotal };
    },
    [getItemDepartment, getItemSubtotalBirr, orderDetailsById],
  );

  const getOrderSubtotalForUnit = useCallback(
    (order: any, unit: any) => {
      if (!order) return 0;
      if (!unit || unit === "all") {
        const total = parseFloat(order?.total_amount);
        if (Number.isFinite(total)) return total;
        const breakdown = getOrderUnitBreakdown(order, null);
        return breakdown.subtotal;
      }
      return getOrderUnitBreakdown(order, unit).subtotal;
    },
    [getOrderUnitBreakdown],
  );

  const getOrderSubtotalForUnitAndMenuItem = useCallback(
    (order: any, unit: any, menuItemId: any) => {
      if (!order) return 0;

      const details = order?.id
        ? orderDetailsById?.[order.id as any] || null
        : null;
      const itemsRaw =
        details?.items &&
        Array.isArray(details.items) &&
        details.items.length > 0
          ? details.items
          : Array.isArray(order?.items)
            ? order.items
            : [];

      const orderFallback = String(order?.type || "")
        .trim()
        .toLowerCase();
      const fallbackDept =
        orderFallback === "bakery" ? "cafe" : orderFallback || null;

      const targetMenuItemId =
        menuItemId && menuItemId !== "all" ? menuItemId : null;

      let subtotal = 0;
      for (const it of itemsRaw) {
        const dept = getItemDepartment(it) || fallbackDept;
        if (unit && unit !== "all" && dept !== unit) continue;
        if ((targetMenuItemId !== null && targetMenuItemId !== "all")) {
          const mid =
            it?.menu_item_id != null ? it.menu_item_id : null;
          if ((mid === null || mid === "") || mid !== targetMenuItemId) continue;
        }
        const line = getItemSubtotalBirr(it);
        if (line > 0) subtotal += line;
      }

      if ((!unit || unit === "all") && !(targetMenuItemId !== null && targetMenuItemId !== "all")) {
        const total = parseFloat(order?.total_amount);
        if (Number.isFinite(total)) return total;
      }

      return subtotal;
    },
    [getItemDepartment, getItemSubtotalBirr, orderDetailsById],
  );

  const getPaymentAmountForUnit = useCallback(
    (payment: any, unit: any) => {
      if (!payment) return 0;
      if (!unit || unit === "all") {
        const amt = parseFloat(payment?.amount);
        return Number.isFinite(amt) ? amt : 0;
      }

      const orderId = resolvePaymentOrderId(payment);
      if ((orderId === null || orderId === "")) return 0;
      const order = orderDetailsById?.[orderId as any] || null;
      if (!order) return 0;

      return getOrderSubtotalForUnit(order, unit);
    },
    [getOrderSubtotalForUnit, orderDetailsById],
  );

  const getPaymentAmountForSelection = useCallback(
    (payment: any, unit: any, menuItemId: any) => {
      if (!payment) return 0;
      if (!menuItemId || menuItemId === "all")
        return getPaymentAmountForUnit(payment, unit);

      const orderId = resolvePaymentOrderId(payment);
      if ((orderId === null || orderId === "")) return 0;
      const order = orderDetailsById?.[orderId as any] || null;
      if (!order) return 0;

      const normalizedUnit = unit === "all" ? null : unit;
      return getOrderSubtotalForUnitAndMenuItem(
        order,
        normalizedUnit,
        menuItemId,
      );
    },
    [
      getOrderSubtotalForUnitAndMenuItem,
      getPaymentAmountForUnit,
      orderDetailsById,
      resolvePaymentOrderId,
    ],
  );

  const orderMatchesBusinessUnit = useCallback(
    (order: any) => {
      if (businessUnit === "all" && selectedMenuItemId === "all") return true;
      if (selectedMenuItemId !== "all") {
        return (
          getOrderSubtotalForUnitAndMenuItem(
            order,
            businessUnit,
            selectedMenuItemId,
          ) > 0
        );
      }
      if (businessUnit === "all") return true;
      return getOrderSubtotalForUnit(order, businessUnit) > 0;
    },
    [
      businessUnit,
      getOrderSubtotalForUnit,
      getOrderSubtotalForUnitAndMenuItem,
      selectedMenuItemId,
    ],
  );

  const statsRangeLabel = useMemo(() => {
    if (statsRange === "today") return "Today's";
    if (statsRange === "yesterday") return "Yesterday's";
    if (statsRange === "week") return "This Week's";
    if (statsRange === "month") return "This Month's";
    if (statsRange === "custom") {
      if (!customStatsDate) return "Custom";
      const parts = String(customStatsDate).split("-");
      if (parts.length !== 3) return "Custom";
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
        return "Custom";
      const dt = new Date(y, m - 1, d);
      if (Number.isNaN(dt.getTime())) return "Custom";
      return `On ${dt.toLocaleDateString()}`;
    }
    return "All Time";
  }, [statsRange, customStatsDate]);

  const filteredRecentPayments = useMemo(() => {
    const all = Array.isArray(paymentsAll) ? paymentsAll : [];
    if (all.length === 0) return [];

    const hasProcessedBy = all.some((p: any) => p && p.processed_by != null);
    const byUser = hasProcessedBy
      ? all.filter(
          (p: any) => p.processed_by === user?.id,
        )
      : all;

    const { from, to } = getDateBoundsForStatsRange();

    const rangePayments =
      from && to
        ? byUser.filter((p: any) => {
            const d = new Date(p.created_at);
            if (Number.isNaN(d.getTime())) return false;
            return d >= from && d <= to;
          })
        : byUser;

    const filteredByUnit = rangePayments.filter(
      (p: any) => {
        const amount = getPaymentAmountForSelection(
          p,
          businessUnit,
          selectedMenuItemId,
        );
        if (amount > 0) return true;

        const orderId = resolvePaymentOrderId(p);
        if (orderId == null) return true;

        return !orderDetailsById?.[orderId];
      },
    );

    return filteredByUnit
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 10);
  }, [
    paymentsAll,
    user?.id,
    businessUnit,
    selectedMenuItemId,
    getDateBoundsForStatsRange,
    getPaymentAmountForSelection,
    resolvePaymentOrderId,
    orderDetailsById,
  ]);

  const pendingOrdersTotalBirr = useMemo(() => {
    const list = Array.isArray(ordersForPayment) ? ordersForPayment : [];
    return list
      .filter((o: any) => orderMatchesBusinessUnit(o))
      .reduce(
        (sum: number, o: any) =>
          sum +
          getOrderSubtotalForUnitAndMenuItem(
            o,
            businessUnit,
            selectedMenuItemId,
          ),
        0,
      );
  }, [
    ordersForPayment,
    businessUnit,
    selectedMenuItemId,
    orderMatchesBusinessUnit,
    getOrderSubtotalForUnitAndMenuItem,
  ]);

  const todayStats = useMemo(() => {
    const all = Array.isArray(paymentsAll) ? paymentsAll : [];
    if (all.length === 0) {
      return {
        paymentsProcessed: 0,
        totalRevenue: 0,
        qrPayments: 0,
        cashPayments: 0,
      };
    }

    const hasProcessedBy = all.some((p: any) => p && p.processed_by != null);
    const byUser = hasProcessedBy
      ? all.filter(
          (p: any) => p.processed_by === user?.id,
        )
      : all;

    const { from, to } = getDateBoundsForStatsRange();

    const rangePayments =
      from && to
        ? byUser.filter((p: any) => {
            const d = new Date(p.created_at);
            if (Number.isNaN(d.getTime())) return false;
            return d >= from && d <= to;
          })
        : byUser;

    const paidEligible = rangePayments
      .filter((p: any) => p?.status === "paid")
      .map((p: any) => ({
        payment: p,
        amount: getPaymentAmountForSelection(
          p,
          businessUnit,
          selectedMenuItemId,
        ),
      }))
      .filter((x: any) => x.amount > 0);

    const totalRevenue = paidEligible.reduce(
      (sum: number, x: any) => sum + x.amount,
      0,
    );
    const paymentsProcessed = paidEligible.length;
    const qrPayments = paidEligible.filter(
      (x: any) => x.payment?.payment_method === "qr_code",
    ).length;
    const cashPayments = paidEligible.filter(
      (x: any) => x.payment?.payment_method === "cash",
    ).length;

    return {
      paymentsProcessed,
      totalRevenue,
      qrPayments,
      cashPayments,
    };
  }, [
    paymentsAll,
    user?.id,
    businessUnit,
    selectedMenuItemId,
    getDateBoundsForStatsRange,
    getPaymentAmountForSelection,
  ]);

  return {
    statsRange,
    setStatsRange,
    customStatsDate,
    setCustomStatsDate,
    businessUnit,
    setBusinessUnit,
    selectedMenuItemId,
    setSelectedMenuItemId,
    tableNumberFilter,
    setTableNumberFilter,
    formatCurrency,
    menuItemsForSelectedUnit,
    getItemSubtotalBirr,
    getOrderUnitBreakdown,
    getOrderSubtotalForUnitAndMenuItem,
    orderMatchesBusinessUnit,
    statsRangeLabel,
    filteredRecentPayments,
    pendingOrdersTotalBirr,
    getPaymentAmountForSelection,
    getDateBoundsForStatsRange,
    todayStats,
  };
};
