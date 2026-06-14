import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Types (ported from app/src/pages/Reports/types.ts)
// ---------------------------------------------------------------------------

export interface DailyStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  voidedOrders: number;
  paidRevenue: number;
  cafeOrders: number;
  restaurantOrders: number;
  baristaOrders: number;
}

export interface WeeklyStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  voidedOrders: number;
  paidRevenue: number;
  avgPaidOrderValue: number;
}

export interface MonthlyStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  voidedOrders: number;
  paidRevenue: number;
  growth: number;
}

export interface TopItem {
  name: string;
  sold: number;
  revenue?: number;
}

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface CategorySalesItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface HourlyPerformanceItem {
  hour: string;
  orders: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  created_at: string;
  type: string;
  total_amount: string | number;
  derived_status: "paid" | "pending" | "voided";
  employee_name?: string | null;
  waiter_name?: string | null;
  employee_id?: number | null;
}

export interface ReportData {
  dailyStats: DailyStats;
  weeklyStats: WeeklyStats;
  monthlyStats: MonthlyStats;
  topItems: TopItem[];
  recentOrders: RecentOrder[];
  paymentMethods: Record<string, number>;
  revenueTrend: RevenueTrendPoint[];
  categorySales: CategorySalesItem[];
  hourlyPerformance: HourlyPerformanceItem[];
}

export interface SourceData {
  orders: any[];
  payments: any[];
  menuItems: any[];
}

// ---------------------------------------------------------------------------
// Constants (ported from app/src/pages/Reports/constants.ts)
// ---------------------------------------------------------------------------

export const INITIAL_REPORT_DATA: ReportData = {
  dailyStats: {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    voidedOrders: 0,
    paidRevenue: 0,
    cafeOrders: 0,
    restaurantOrders: 0,
    baristaOrders: 0,
  },
  weeklyStats: {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    voidedOrders: 0,
    paidRevenue: 0,
    avgPaidOrderValue: 0,
  },
  monthlyStats: {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    voidedOrders: 0,
    paidRevenue: 0,
    growth: 0,
  },
  topItems: [],
  recentOrders: [],
  paymentMethods: {},
  revenueTrend: [],
  categorySales: [],
  hourlyPerformance: [],
};

// ---------------------------------------------------------------------------
// Pure helpers (ported from app/src/pages/Reports/utils.ts).
// The desktop app used an approximate-server-clock; on the web we use the
// browser clock directly.
// ---------------------------------------------------------------------------

export const extractCollection = (response: any, key: string): any[] => {
  const direct = response?.[key];
  if (Array.isArray(direct)) return direct;

  const nested = response?.data?.[key];
  if (Array.isArray(nested)) return nested;

  const wrapped = response?.data?.data?.[key];
  if (Array.isArray(wrapped)) return wrapped;

  return [];
};

export const buildSheetFromRows = (rows: any[], headers: string[]): XLSX.WorkSheet => {
  if (Array.isArray(rows) && rows.length > 0) {
    return XLSX.utils.json_to_sheet(rows);
  }

  return XLSX.utils.aoa_to_sheet([Array.isArray(headers) ? headers : []]);
};

export const filterSourceDataByDateRange = (
  ordersRaw: any[],
  paymentsRaw: any[],
  menuItemsRaw: any[],
  fromRaw: string,
  toRaw: string,
) => {
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const menuItems = Array.isArray(menuItemsRaw) ? menuItemsRaw : [];

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const parseLocalDateOnly = (ymd: string) => {
    const s = String(ymd || "").trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const da = parseInt(m[3], 10);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null;
    return new Date(y, mo - 1, da);
  };

  const rangeFrom = fromRaw ? parseLocalDateOnly(fromRaw) : null;
  const rangeTo = toRaw ? parseLocalDateOnly(toRaw) : null;
  const fromDt = rangeFrom ? startOfDay(rangeFrom) : null;
  const toDt = rangeTo ? endOfDay(rangeTo) : null;

  const withinRange = (iso: string) => {
    if (!fromDt && !toDt) return true;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return false;
    if (fromDt && dt < fromDt) return false;
    if (toDt && dt > toDt) return false;
    return true;
  };

  return {
    orders: orders.filter((order) => withinRange(order?.created_at)),
    payments: payments.filter((payment) => withinRange(payment?.created_at)),
    menuItems,
  };
};

export const normalizeStatus = (s: string) => String(s || "").trim().toLowerCase();

export const isVoidedOrderStatus = (s: string) => {
  const st = normalizeStatus(s);
  return ["deleted", "canceled", "cancelled", "void", "voided"].includes(st);
};

export const normalizeId = (v: any) => (v == null ? null : String(v));

export const normalizeOrderType = (value: any) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "bakery" ? "cafe" : normalized;
};

export const toIsoIfValid = (value: any) => {
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
};

export const getLaterIso = (currentValue: any, nextValue: any) => {
  if (!currentValue) return nextValue || null;
  if (!nextValue) return currentValue || null;
  return new Date(currentValue) >= new Date(nextValue) ? currentValue : nextValue;
};

export const getEarlierIso = (currentValue: any, nextValue: any) => {
  if (!currentValue) return nextValue || null;
  if (!nextValue) return currentValue || null;
  return new Date(currentValue) <= new Date(nextValue) ? currentValue : nextValue;
};

export const getItemSubtotal = (it: any) => {
  const qty = parseFloat(it?.quantity || 0);
  const subtotal = parseFloat(it?.subtotal);
  if (Number.isFinite(subtotal)) return subtotal;
  const unitPrice = parseFloat(it?.unit_price);
  if (Number.isFinite(unitPrice) && qty > 0) return unitPrice * qty;
  const price = parseFloat(it?.price);
  if (Number.isFinite(price) && qty > 0) return price * qty;
  return 0;
};

export const makeGetItemDepartment = (menuItems: any[]) => {
  const menuMainCategoryById: { [key: number]: string } = {};
  menuItems.forEach((it) => {
    const id = it?.id != null ? it.id : null;
    if (id === "") return;
    const main = String(it?.main_category || "").trim().toLowerCase();
    if (!main) return;
    menuMainCategoryById[id as number] = main;
  });

  return (item: any) => {
    const menuId = item?.menu_item_id != null ? item.menu_item_id : null;
    const mapped =
      menuId !== null && menuId !== undefined && menuId !== ""
        ? String(menuMainCategoryById[menuId as number] || "").trim().toLowerCase()
        : "";
    return mapped;
  };
};

export const makeGetOrderSubtotalForUnit = (
  getItemDepartment: (item: any) => string | null,
) => {
  return (order: any, targetUnit: string) => {
    if (!order) return 0;
    const items = Array.isArray(order?.items) ? order.items : [];
    const orderFallback = String(order?.type || "").trim().toLowerCase();
    const fallbackDept = orderFallback === "bakery" ? "cafe" : orderFallback || null;
    let subtotal = 0;
    for (const it of items) {
      const dept = getItemDepartment(it) || fallbackDept;
      if (targetUnit && targetUnit !== "all" && dept !== targetUnit) continue;
      subtotal += getItemSubtotal(it);
    }
    if (!targetUnit || targetUnit === "all") {
      const total = parseFloat(order?.total_amount);
      return Number.isFinite(total) ? total : subtotal;
    }
    return subtotal;
  };
};

export const makeIsPaidOrder = (paidOrderIdSet: Set<string | null>) => {
  return (order: any) => {
    const oid = normalizeId(order?.id);
    if (oid && paidOrderIdSet.has(oid)) return true;
    const st = normalizeStatus(order?.status);
    const pst = normalizeStatus(order?.payment_status);
    return st === "paid" || st === "completed" || pst === "paid";
  };
};

export const calculateReportData = (
  ordersRaw: any[],
  paymentsRaw: any[],
  menuItemsRaw: any[],
  unitRaw: string,
  topItemsPeriodRaw = "selected_range",
): ReportData => {
  const unit = String(unitRaw || "all").trim().toLowerCase() || "all";
  const topItemsPeriod =
    String(topItemsPeriodRaw || "selected_range").trim().toLowerCase() || "selected_range";
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const menuItems = Array.isArray(menuItemsRaw) ? menuItemsRaw : [];

  const getItemDepartment = makeGetItemDepartment(menuItems);
  const getOrderSubtotalForUnit = makeGetOrderSubtotalForUnit(getItemDepartment);

  const paidPayments = payments.filter((p) => normalizeStatus(p?.status) === "paid");
  const paidOrderIdSet = new Set(
    paidPayments.map((p) => normalizeId(p?.order_id)).filter(Boolean),
  );
  const isPaidOrder = makeIsPaidOrder(paidOrderIdSet);

  const getDerivedStatus = (order: any) => {
    if (isVoidedOrderStatus(order?.status)) return "voided";
    if (isPaidOrder(order)) return "paid";
    return "pending";
  };

  const orderMatchesUnit = (order: any) => {
    if (unit === "all") return true;
    return getOrderSubtotalForUnit(order, unit) > 0;
  };

  const getOrderTotalForSelectedUnit = (order: any) => {
    if (!unit || unit === "all") return getOrderSubtotalForUnit(order, "all");
    return getOrderSubtotalForUnit(order, unit);
  };

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const within = (iso: string, from: Date, to: Date) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return false;
    return dt >= from && dt <= to;
  };

  const todayFrom = startOfDay(now);
  const todayTo = endOfDay(now);
  const weekFrom = new Date(todayFrom);
  weekFrom.setDate(weekFrom.getDate() - 6);
  const monthFrom = new Date(todayFrom);
  monthFrom.setDate(monthFrom.getDate() - 29);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const ordersToday = orders.filter((o) => within(o?.created_at, todayFrom, todayTo));
  const ordersWeek = orders.filter((o) => within(o?.created_at, weekFrom, todayTo));
  const ordersMonth = orders.filter((o) => within(o?.created_at, monthFrom, todayTo));

  const summarize = (list: any[]) => {
    const counts: { [key: string]: number } = { paid: 0, pending: 0, voided: 0 };
    const unitCounts = { cafe: 0, restaurant: 0, barista: 0 };
    let paidRevenue = 0;

    let considered = 0;
    for (const o of list) {
      if (!orderMatchesUnit(o)) continue;
      considered += 1;

      const status = getDerivedStatus(o);
      counts[status] = (counts[status] || 0) + 1;

      if (status === "paid") {
        paidRevenue += getOrderTotalForSelectedUnit(o);
      }

      if (unit === "all") {
        const cafeAmt = getOrderSubtotalForUnit(o, "cafe");
        const restAmt = getOrderSubtotalForUnit(o, "restaurant");
        const barAmt = getOrderSubtotalForUnit(o, "barista");
        if (cafeAmt > 0) unitCounts.cafe += 1;
        if (restAmt > 0) unitCounts.restaurant += 1;
        if (barAmt > 0) unitCounts.barista += 1;
      }
    }

    if (unit !== "all") {
      unitCounts.cafe = unit === "cafe" ? considered : 0;
      unitCounts.restaurant = unit === "restaurant" ? considered : 0;
      unitCounts.barista = unit === "barista" ? considered : 0;
    }

    const nonVoidedTotal = considered - (counts.voided || 0);
    return {
      totalOrders: nonVoidedTotal,
      paidOrders: counts.paid || 0,
      pendingOrders: counts.pending || 0,
      voidedOrders: counts.voided || 0,
      paidRevenue,
      cafeOrders: unitCounts.cafe,
      restaurantOrders: unitCounts.restaurant,
      baristaOrders: unitCounts.barista,
    };
  };

  const dailySummary = summarize(ordersToday);
  const weeklySummary = summarize(ordersWeek);
  const monthlySummary = summarize(ordersMonth);

  const avgPaidOrderValue =
    weeklySummary.paidOrders > 0 ? weeklySummary.paidRevenue / weeklySummary.paidOrders : 0;

  const revenuePrevMonth = orders
    .filter((o) => within(o?.created_at, prevMonthStart, prevMonthEnd))
    .filter((o) => orderMatchesUnit(o))
    .filter((o) => getDerivedStatus(o) === "paid")
    .reduce((sum, o) => sum + getOrderTotalForSelectedUnit(o), 0);

  const revenueThisMonth = orders
    .filter((o) => within(o?.created_at, monthStart, todayTo))
    .filter((o) => orderMatchesUnit(o))
    .filter((o) => getDerivedStatus(o) === "paid")
    .reduce((sum, o) => sum + getOrderTotalForSelectedUnit(o), 0);

  const growthPct =
    revenuePrevMonth > 0
      ? ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100
      : 0;

  const paymentMethods = paidPayments
    .filter((p) => {
      const oid = normalizeId(p?.order_id);
      if (!oid) return unit === "all";
      const order = orders.find((o) => normalizeId(o?.id) === oid);
      if (!order) return unit === "all";
      if (isVoidedOrderStatus(order?.status)) return false;
      return orderMatchesUnit(order);
    })
    .reduce((acc: { [key: string]: number }, payment) => {
      const method = String(payment?.payment_method || "unknown").trim().toLowerCase();
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

  const topItemMap = new Map<string, number>();
  const topItemRevenueMap = new Map<string, number>();
  const categorySalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const revenueTrendMap = new Map<string, { label: string; revenue: number; orders: number }>();
  const hourlyMap = new Map<number, { hour: string; orders: number; revenue: number }>();
  for (let hour = 0; hour < 24; hour += 1) {
    hourlyMap.set(hour, {
      hour: `${String(hour).padStart(2, "0")}:00`,
      orders: 0,
      revenue: 0,
    });
  }

  const formatDateKey = (value: any) => {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  };

  orders
    .filter((o) => orderMatchesUnit(o))
    .filter((o) => !isVoidedOrderStatus(o?.status))
    .forEach((o) => {
      const paid = getDerivedStatus(o) === "paid";
      const orderRevenue = paid ? getOrderTotalForSelectedUnit(o) : 0;
      const dateKey = formatDateKey(o?.created_at);
      if (dateKey) {
        const existing = revenueTrendMap.get(dateKey) || {
          label: new Date(dateKey).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          revenue: 0,
          orders: 0,
        };
        existing.orders += 1;
        existing.revenue += orderRevenue;
        revenueTrendMap.set(dateKey, existing);
      }

      const hour = new Date(o?.created_at).getHours();
      if (Number.isFinite(hour) && hourlyMap.has(hour)) {
        const existing = hourlyMap.get(hour)!;
        existing.orders += 1;
        existing.revenue += orderRevenue;
      }

      const items = Array.isArray(o?.items) ? o.items : [];
      const orderFallback = String(o?.type || "").trim().toLowerCase();
      const fallbackDept = orderFallback === "bakery" ? "cafe" : orderFallback || null;
      items.forEach((it: any) => {
        const dept = getItemDepartment(it) || fallbackDept || "uncategorized";
        if (unit !== "all" && dept !== unit) return;
        const qty = parseFloat(it?.quantity || 0) || 0;
        const revenue = paid ? getItemSubtotal(it) : 0;
        const category =
          String(it?.category || it?.sub_category || dept || "Uncategorized").trim() ||
          "Uncategorized";
        const key = category.toLowerCase();
        const existing = categorySalesMap.get(key) || { name: category, quantity: 0, revenue: 0 };
        existing.quantity += qty;
        existing.revenue += revenue;
        categorySalesMap.set(key, existing);
      });
    });

  const topItemsSourceOrders = (() => {
    if (topItemsPeriod === "this_week") {
      return orders.filter((o) => within(o?.created_at, weekFrom, todayTo));
    }

    if (topItemsPeriod === "this_month") {
      return orders.filter((o) => within(o?.created_at, monthStart, todayTo));
    }

    return orders;
  })();

  const eligibleTopItemOrders = topItemsSourceOrders
    .filter((o) => orderMatchesUnit(o))
    .filter((o) => !isVoidedOrderStatus(o?.status));

  const topItemOrders = eligibleTopItemOrders.some((o) => getDerivedStatus(o) === "paid")
    ? eligibleTopItemOrders.filter((o) => getDerivedStatus(o) === "paid")
    : eligibleTopItemOrders;

  topItemOrders.forEach((o) => {
    const items = Array.isArray(o?.items) ? o.items : [];
    const orderFallback = String(o?.type || "").trim().toLowerCase();
    const fallbackDept = orderFallback === "bakery" ? "cafe" : orderFallback || null;
    items.forEach((it: any) => {
      if (unit !== "all") {
        const dept = getItemDepartment(it) || fallbackDept;
        if (dept !== unit) return;
      }
      const name = String(it?.menu_item_name || it?.name || "").trim();
      if (!name) return;
      const qty = parseFloat(it?.quantity || 0) || 0;
      const revenue = getItemSubtotal(it);
      const prev = topItemMap.get(name) || 0;
      const prevRevenue = topItemRevenueMap.get(name) || 0;
      topItemMap.set(name, prev + qty);
      topItemRevenueMap.set(name, prevRevenue + revenue);
    });
  });
  const topItems = Array.from(topItemMap.entries())
    .map(([name, sold]) => ({ name, sold, revenue: topItemRevenueMap.get(name) || 0 }))
    .sort((a, b) => (b.sold || 0) - (a.sold || 0))
    .slice(0, 8);

  const revenueTrend = Array.from(revenueTrendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([, point]) => point);

  const categorySales = Array.from(categorySalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const hourlyPerformance = Array.from(hourlyMap.values())
    .filter((point) => point.orders > 0 || point.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const recentOrders = orders
    .slice()
    .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
    .filter((o) => orderMatchesUnit(o))
    .slice(0, 10)
    .map((o) => ({
      ...o,
      derived_status: getDerivedStatus(o),
    }));

  return {
    dailyStats: dailySummary,
    weeklyStats: {
      ...weeklySummary,
      avgPaidOrderValue,
    },
    monthlyStats: {
      ...monthlySummary,
      paidRevenue: revenueThisMonth,
      growth: growthPct,
    },
    topItems,
    recentOrders,
    paymentMethods,
    revenueTrend,
    categorySales,
    hourlyPerformance,
  };
};

// ---------------------------------------------------------------------------
// Period stats — drives the single date-dependent summary card on the report
// page. Computed from the full source set (independent of the date-range
// picker) so the Today / This Month / This Year toggle is the sole driver.
// ---------------------------------------------------------------------------

export type StatsPeriod = "today" | "month" | "year";

export interface PeriodStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  voidedOrders: number;
  paidRevenue: number;
  avgPaidOrderValue: number;
}

export const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "Today",
  month: "This Month",
  year: "This Year",
};

export const getPeriodRange = (period: StatsPeriod, now: Date = new Date()) => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const to = endOfDay(now);
  if (period === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
  if (period === "year") return { from: new Date(now.getFullYear(), 0, 1), to };
  return { from: startOfDay(now), to };
};

export const calculatePeriodStats = (
  ordersRaw: any[],
  paymentsRaw: any[],
  menuItemsRaw: any[],
  unitRaw: string,
  period: StatsPeriod,
): PeriodStats => {
  const unit = String(unitRaw || "all").trim().toLowerCase() || "all";
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const menuItems = Array.isArray(menuItemsRaw) ? menuItemsRaw : [];

  const getItemDepartment = makeGetItemDepartment(menuItems);
  const getOrderSubtotalForUnit = makeGetOrderSubtotalForUnit(getItemDepartment);
  const paidPayments = payments.filter((p) => normalizeStatus(p?.status) === "paid");
  const paidOrderIdSet = new Set(paidPayments.map((p) => normalizeId(p?.order_id)).filter(Boolean));
  const isPaidOrder = makeIsPaidOrder(paidOrderIdSet);

  const getDerivedStatus = (order: any) => {
    if (isVoidedOrderStatus(order?.status)) return "voided";
    if (isPaidOrder(order)) return "paid";
    return "pending";
  };
  const orderMatchesUnit = (order: any) => {
    if (unit === "all") return true;
    return getOrderSubtotalForUnit(order, unit) > 0;
  };
  const getOrderTotalForSelectedUnit = (order: any) =>
    unit === "all" ? getOrderSubtotalForUnit(order, "all") : getOrderSubtotalForUnit(order, unit);

  const { from, to } = getPeriodRange(period);
  const within = (iso: string) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return false;
    return dt >= from && dt <= to;
  };

  let totalOrders = 0;
  let paidOrders = 0;
  let pendingOrders = 0;
  let voidedOrders = 0;
  let paidRevenue = 0;
  for (const o of orders) {
    if (!within(o?.created_at)) continue;
    if (!orderMatchesUnit(o)) continue;
    const status = getDerivedStatus(o);
    if (status === "voided") {
      voidedOrders += 1;
      continue;
    }
    totalOrders += 1;
    if (status === "paid") {
      paidOrders += 1;
      paidRevenue += getOrderTotalForSelectedUnit(o);
    } else {
      pendingOrders += 1;
    }
  }
  const avgPaidOrderValue = paidOrders > 0 ? paidRevenue / paidOrders : 0;
  return { totalOrders, paidOrders, pendingOrders, voidedOrders, paidRevenue, avgPaidOrderValue };
};

export const generateCSVReport = (metricsData: ReportData): string => {
  const headers = ["Metric", "Value", "Period"];
  const rows: (string | number)[][] = [
    ["Total Orders Today", metricsData.dailyStats.totalOrders, "Daily"],
    ["Paid Revenue Today", (metricsData.dailyStats.paidRevenue || 0).toFixed(2), "Daily"],
    ["Paid Orders Today", metricsData.dailyStats.paidOrders, "Daily"],
    ["Pending Orders Today", metricsData.dailyStats.pendingOrders, "Daily"],
    ["Voided Orders Today", metricsData.dailyStats.voidedOrders, "Daily"],
    ["Cafe Orders Today", metricsData.dailyStats.cafeOrders, "Daily"],
    ["Restaurant Orders Today", metricsData.dailyStats.restaurantOrders, "Daily"],
    ["Barista Orders Today", metricsData.dailyStats.baristaOrders, "Daily"],
    ["Weekly Orders", metricsData.weeklyStats.totalOrders, "Weekly"],
    ["Weekly Paid Revenue", (metricsData.weeklyStats.paidRevenue || 0).toFixed(2), "Weekly"],
    ["Weekly Paid Orders", metricsData.weeklyStats.paidOrders, "Weekly"],
    ["Weekly Pending Orders", metricsData.weeklyStats.pendingOrders, "Weekly"],
    ["Weekly Avg Paid Order", (metricsData.weeklyStats.avgPaidOrderValue || 0).toFixed(2), "Weekly"],
    ["Monthly Orders", metricsData.monthlyStats.totalOrders, "Monthly"],
    ["Monthly Paid Revenue", (metricsData.monthlyStats.paidRevenue || 0).toFixed(2), "Monthly"],
    ["Monthly Growth", `${metricsData.monthlyStats.growth}%`, "Monthly"],
  ];

  Object.entries(metricsData.paymentMethods || {}).forEach(([method, count]) => {
    rows.push([`Payment Method: ${method.replace("_", " ")}`, String(count), "Selected Range"]);
  });

  const csvRows = [headers, ...rows];
  return csvRows.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n");
};

// ---------------------------------------------------------------------------
// Multi-sheet Excel export (ported from the desktop handleExportReport).
// Builds the workbook from already-fetched source data and triggers a download.
// ---------------------------------------------------------------------------

export function exportBusinessData(
  source: SourceData,
  businessUnit: string,
  dateFrom: string,
  dateTo: string,
) {
  const filtered = filterSourceDataByDateRange(
    source.orders,
    source.payments,
    source.menuItems,
    dateFrom,
    dateTo,
  );

  const safeOrders = Array.isArray(filtered.orders) ? filtered.orders : [];
  const safePayments = Array.isArray(filtered.payments) ? filtered.payments : [];
  const safeMenuItems = Array.isArray(filtered.menuItems) ? filtered.menuItems : [];
  const allOrders = Array.isArray(source.orders) ? source.orders : [];
  const selectedUnit = String(businessUnit || "all").trim().toLowerCase() || "all";

  const getItemDepartment = makeGetItemDepartment(safeMenuItems);
  const getOrderSubtotalForUnit = makeGetOrderSubtotalForUnit(getItemDepartment);

  const paidPayments = safePayments.filter((p) => normalizeStatus(p?.status) === "paid");
  const paidOrderIdSet = new Set(paidPayments.map((p) => normalizeId(p?.order_id)).filter(Boolean));
  const allOrdersById = new Map(allOrders.map((order) => [normalizeId(order?.id), order]));
  const isPaidOrder = makeIsPaidOrder(paidOrderIdSet);

  const getDerivedStatus = (order: any) => {
    if (isVoidedOrderStatus(order?.status)) return "voided";
    if (isPaidOrder(order)) return "paid";
    return "pending";
  };

  const orderMatchesUnit = (order: any) => {
    if (selectedUnit === "all") return true;
    return getOrderSubtotalForUnit(order, selectedUnit) > 0;
  };

  const getOrderTotalForSelectedUnit = (order: any) => {
    if (selectedUnit === "all") return getOrderSubtotalForUnit(order, "all");
    return getOrderSubtotalForUnit(order, selectedUnit);
  };

  const paymentMatchesUnit = (payment: any) => {
    if (selectedUnit === "all") return true;
    const order = allOrdersById.get(normalizeId(payment?.order_id));
    if (order) return orderMatchesUnit(order);
    return normalizeOrderType(payment?.order_type) === selectedUnit;
  };

  const relevantOrders = safeOrders.filter((order) => orderMatchesUnit(order));
  const activeOrders = relevantOrders.filter((order) => !isVoidedOrderStatus(order?.status));
  const paidOrders = activeOrders.filter((order) => isPaidOrder(order));
  const pendingOrders = activeOrders.filter((order) => !isPaidOrder(order));
  const voidedOrders = relevantOrders.filter((order) => isVoidedOrderStatus(order?.status));
  const relevantPayments = safePayments.filter((payment) => paymentMatchesUnit(payment));
  const relevantPaidPayments = relevantPayments.filter(
    (payment) => normalizeStatus(payment?.status) === "paid",
  );
  const exportMetrics = calculateReportData(safeOrders, safePayments, safeMenuItems, selectedUnit);

  const itemSummaryMap = new Map<string, any>();
  safeOrders
    .filter((order) => !isVoidedOrderStatus(order?.status))
    .filter((order) => orderMatchesUnit(order))
    .forEach((o) => {
      const items = Array.isArray(o?.items) ? o.items : [];
      const paid = isPaidOrder(o);
      for (const it of items) {
        const orderFallback = String(o?.type || "").trim().toLowerCase();
        const fallbackDept = orderFallback === "bakery" ? "cafe" : orderFallback || null;
        const dept = getItemDepartment(it) || fallbackDept;
        if (selectedUnit !== "all" && dept !== selectedUnit) continue;

        const mid = it?.menu_item_id != null ? it.menu_item_id : null;
        const qty = parseFloat(it?.quantity || 0);
        const revenue = getItemSubtotal(it);
        const key = Number.isFinite(mid)
          ? `menu-${mid}`
          : `name-${String(it?.menu_item_name || it?.name || "unknown").trim().toLowerCase()}`;

        const existing = itemSummaryMap.get(key) || {
          menu_item_id: Number.isFinite(mid) ? mid : null,
          menu_item_name: it?.menu_item_name || it?.name || "Unknown Item",
          category: it?.category || it?.sub_category || null,
          main_category: it?.main_category || null,
          business_unit: dept || normalizeOrderType(o?.type) || "unknown",
          first_ordered_at: null as any,
          last_ordered_at: null as any,
          first_paid_at: null as any,
          last_paid_at: null as any,
          ordered_qty: 0,
          paid_qty: 0,
          ordered_revenue: 0,
          paid_revenue: 0,
        };

        const orderedAt = toIsoIfValid(o?.created_at);
        const paidAt = toIsoIfValid(o?.paid_at) || orderedAt;

        existing.ordered_qty += Number.isFinite(qty) ? qty : 0;
        existing.ordered_revenue += Number.isFinite(revenue) ? revenue : 0;
        existing.first_ordered_at = getEarlierIso(existing.first_ordered_at, orderedAt);
        existing.last_ordered_at = getLaterIso(existing.last_ordered_at, orderedAt);
        if (paid) {
          existing.paid_qty += Number.isFinite(qty) ? qty : 0;
          existing.paid_revenue += Number.isFinite(revenue) ? revenue : 0;
          existing.first_paid_at = getEarlierIso(existing.first_paid_at, paidAt);
          existing.last_paid_at = getLaterIso(existing.last_paid_at, paidAt);
        }

        itemSummaryMap.set(key, existing);
      }
    });

  const exportSummary = (() => {
    const paidRevenue = paidOrders.reduce(
      (sum, order) => sum + getOrderTotalForSelectedUnit(order),
      0,
    );
    const paymentsTotal = relevantPaidPayments.reduce(
      (sum, payment) => sum + (parseFloat(payment?.amount) || 0),
      0,
    );
    return {
      totalOrders: activeOrders.length,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      voidedOrders: voidedOrders.length,
      paidRevenue,
      totalPayments: relevantPayments.length,
      paidPayments: relevantPaidPayments.length,
      paymentsTotal,
    };
  })();

  const wb = XLSX.utils.book_new();

  const summaryAoa = [
    ["Report", "Business Data Export"],
    ["Business Unit", selectedUnit === "all" ? "All" : selectedUnit],
    ["Date From", dateFrom || "All"],
    ["Date To", dateTo || "All"],
    ["Generated At", new Date().toLocaleString()],
    ["Summary Metric", "Value"],
    ["Total Orders", exportSummary.totalOrders],
    ["Paid Orders", exportSummary.paidOrders],
    ["Pending Orders", exportSummary.pendingOrders],
    ["Voided Orders", exportSummary.voidedOrders],
    ["Paid Revenue (Orders Total)", exportSummary.paidRevenue],
    ["Payments Count", exportSummary.totalPayments],
    ["Paid Payments Count", exportSummary.paidPayments],
    ["Paid Payments Total", exportSummary.paymentsTotal],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), "Summary");

  const orderHeaders = [
    "order_id",
    "created_at",
    "type",
    "status",
    "derived_status",
    "payment_status",
    "employee_id",
    "employee_name",
    "table_number",
    "total_amount",
    "selected_unit",
    "selected_unit_total_amount",
    "notes",
    "menu_item_id",
    "menu_item_name",
    "category",
    "main_category",
    "item_type",
    "quantity",
    "unit_price",
    "subtotal",
  ];

  const orderRows: any[] = [];
  relevantOrders.forEach((order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const orderFallback = String(order?.type || "").trim().toLowerCase();
    const fallbackDept = orderFallback === "bakery" ? "cafe" : orderFallback || null;
    const relevantItems =
      selectedUnit === "all"
        ? items
        : items.filter((item: any) => (getItemDepartment(item) || fallbackDept) === selectedUnit);
    const selectedUnitTotal = getOrderTotalForSelectedUnit(order);
    const derivedStatus = getDerivedStatus(order);

    const base = {
      order_id: order?.id,
      created_at: order?.created_at,
      type: order?.type,
      status: order?.status,
      derived_status: derivedStatus,
      payment_status: order?.payment_status,
      employee_id: order?.employee_id,
      employee_name: order?.employee_name,
      table_number: order?.table_number,
      total_amount: order?.total_amount,
      selected_unit: selectedUnit,
      selected_unit_total_amount: selectedUnitTotal,
      notes: order?.notes,
    };

    if (relevantItems.length === 0) {
      orderRows.push({
        ...base,
        menu_item_id: null,
        menu_item_name: null,
        category: null,
        main_category: null,
        item_type: null,
        quantity: null,
        unit_price: null,
        subtotal: null,
      });
      return;
    }

    relevantItems.forEach((it: any) => {
      orderRows.push({
        ...base,
        menu_item_id: it?.menu_item_id,
        menu_item_name: it?.menu_item_name || it?.name,
        category: it?.category,
        main_category: it?.main_category,
        item_type: it?.item_type,
        quantity: it?.quantity,
        unit_price: it?.unit_price,
        subtotal: it?.subtotal,
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, buildSheetFromRows(orderRows, orderHeaders), "Orders");

  const paymentHeaders = [
    "payment_id",
    "created_at",
    "order_id",
    "order_type",
    "selected_unit",
    "amount",
    "payment_method",
    "status",
    "processed_by",
    "processed_by_name",
    "description",
  ];
  const paymentRows = relevantPayments.map((p) => ({
    payment_id: p?.id,
    created_at: p?.created_at,
    order_id: p?.order_id,
    order_type: p?.order_type,
    selected_unit: selectedUnit,
    amount: p?.amount,
    payment_method: p?.payment_method,
    status: p?.status,
    processed_by: p?.processed_by,
    processed_by_name: p?.processed_by_name,
    description: p?.description,
  }));
  XLSX.utils.book_append_sheet(wb, buildSheetFromRows(paymentRows, paymentHeaders), "Payments");

  const itemSummaryHeaders = [
    "menu_item_id",
    "menu_item_name",
    "category",
    "main_category",
    "business_unit",
    "first_ordered_at",
    "last_ordered_at",
    "first_paid_at",
    "last_paid_at",
    "ordered_qty",
    "paid_qty",
    "ordered_revenue",
    "paid_revenue",
  ];
  const itemSummaryRows = Array.from(itemSummaryMap.values()).sort(
    (a, b) => (b.ordered_qty || 0) - (a.ordered_qty || 0),
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildSheetFromRows(itemSummaryRows, itemSummaryHeaders),
    "Items Summary",
  );

  XLSX.utils.book_append_sheet(
    wb,
    buildSheetFromRows(exportMetrics.categorySales || [], ["name", "quantity", "revenue"]),
    "Category Sales",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildSheetFromRows(exportMetrics.hourlyPerformance || [], ["hour", "orders", "revenue"]),
    "Hourly Performance",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildSheetFromRows(exportMetrics.revenueTrend || [], ["label", "orders", "revenue"]),
    "Revenue Trend",
  );

  const metricsCsv = generateCSVReport(exportMetrics);
  const metricsAoa = String(metricsCsv || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) =>
      line.split(",").map((cell) => String(cell || "").replace(/^"|"$/g, "").replace(/""/g, '"')),
    );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metricsAoa), "Metrics");

  const todayStr = new Date().toISOString().slice(0, 10);
  const fromSlug = dateFrom || "all";
  const toSlug = dateTo || "all";
  const unitSlug = selectedUnit || "all";
  const filename = `business-data-${unitSlug}-${fromSlug}-to-${toSlug}-${todayStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}
