import { useMemo } from "react";

const normalizeId = (v: any) => (v == null ? null : String(v));

const isVoidedOrderStatus = (s: any) => {
  const st = String(s || "")
    .trim()
    .toLowerCase();
  return ["deleted", "cancelled", "canceled", "void", "voided"].includes(st);
};

const isPaidPaymentStatus = (s: any) =>
  String(s || "")
    .trim()
    .toLowerCase() === "paid";

const getItemDepartment = (
  item: any,
  menuMainCategoryById: Record<string, string>,
) => {
  if (!item) return null;

  // 1) Prefer explicit main_category on the item
  const explicitMain = String(item?.main_category || "").trim().toLowerCase();
  if (explicitMain) return explicitMain;

  // 2) Next prefer mapped main category from menu items (by menu_item_id)
  const menuId = String(item?.menu_item_id ?? "").trim();
  if (menuId) {
    const mapped = String(menuMainCategoryById[menuId] || "").trim().toLowerCase();
    if (mapped) return mapped;
  }

  // 3) Finally fall back to item_type if present
  const explicitType = String(item?.item_type || "").trim().toLowerCase();
  if (explicitType) return explicitType;

  return null;
};

const getItemSubtotalBirr = (item: any) => {
  const qty = parseInt(item?.quantity, 10) || 0;
  const subtotal = parseFloat(item?.subtotal);
  if (Number.isFinite(subtotal)) return subtotal;
  const unitPrice = parseFloat(item?.unit_price);
  if (Number.isFinite(unitPrice) && qty > 0) return unitPrice * qty;
  const price = parseFloat(item?.price);
  if (Number.isFinite(price) && qty > 0) return price * qty;
  return 0;
};

const getOrderSubtotalForUnit = (
  order: any,
  unit: string | null,
  menuMainCategoryById: Record<string, string>,
) => {
  if (!order) return 0;
  if (!unit) {
    const total = parseFloat(order?.total_amount);
    return Number.isFinite(total) ? total : 0;
  }
  const itemsRaw = Array.isArray(order?.items) ? order.items : [];
  const orderFallback = String(order?.type || "")
    .trim()
    .toLowerCase();
  const fallbackDept =
    orderFallback === "bakery" ? "cafe" : orderFallback || null;
  let subtotal = 0;
  for (const it of itemsRaw) {
    const dept = getItemDepartment(it, menuMainCategoryById) || fallbackDept;
    if (dept !== unit) continue;
    subtotal += getItemSubtotalBirr(it);
  }
  return subtotal;
};

const getOrderSubtotalForUnitAndMenuItem = (
  order: any,
  unit: string | null,
  menuItemId: string | null,
  menuMainCategoryById: Record<string, string>,
) => {
  if (!order) return 0;

  const targetMenuItemId =
    menuItemId && menuItemId !== "all" ? menuItemId : null;

  const itemsRaw = Array.isArray(order?.items) ? order.items : [];
  const orderFallback = String(order?.type || "")
    .trim()
    .toLowerCase();
  const fallbackDept =
    orderFallback === "bakery" ? "cafe" : orderFallback || null;

  let subtotal = 0;
  for (const it of itemsRaw) {
    const dept = getItemDepartment(it, menuMainCategoryById) || fallbackDept;
    if (unit && dept !== unit) continue;
    if (targetMenuItemId) {
      const mid =
        it?.menu_item_id != null ? String(it.menu_item_id) : null;
      if (!mid || mid !== targetMenuItemId) continue;
    }
    subtotal += getItemSubtotalBirr(it);
  }

  if (!unit && !targetMenuItemId) {
    const total = parseFloat(order?.total_amount);
    return Number.isFinite(total) ? total : subtotal;
  }

  return subtotal;
};

const dedupePaidPaymentsByOrder = (payments: any[]) => {
  const list = Array.isArray(payments) ? payments : [];
  const byOrder = new Map();
  const standalone: any[] = [];

  for (const p of list) {
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
    const nextTs = new Date(p?.created_at || p?.updated_at || 0).getTime();
    if (nextTs >= prevTs) byOrder.set(orderKey, p);
  }

  return [...byOrder.values(), ...standalone];
};

export const useOrderFiltering = (
  dashboardData: any,
  businessUnit: string,
  selectedMenuItemId: string,
  withinRange: (createdAt: string | null | undefined) => boolean,
) => {
  return useMemo(() => {
    const menuItemsSafe = Array.isArray(dashboardData.menuItems)
      ? dashboardData.menuItems
      : [];

    const menuMainCategoryById = (() => {
      const next: Record<string, string> = {};
      for (const it of menuItemsSafe) {
        const id = it?.id != null ? it.id : null;
        if ((id === "")) continue;
        const main = String(it?.main_category || "")
          .trim()
          .toLowerCase();
        if (!main) continue;
        next[id as any] = main;
      }
      return next;
    })();

    const allOrdersSafe = Array.isArray(dashboardData.allOrders)
      ? dashboardData.allOrders
      : [];
    const allPaymentsSafe = Array.isArray(dashboardData.allPayments)
      ? dashboardData.allPayments
      : [];

    const orderById = (() => {
      const map = new Map();
      for (const o of allOrdersSafe) {
        if (!o?.id) continue;
        map.set(String(o.id), o);
      }
      return map;
    })();

    const invalidOrderIdSet = new Set(
      allOrdersSafe
        .filter((o: any) => isVoidedOrderStatus(o?.status))
        .map((o: any) => normalizeId(o?.id))
        .filter(Boolean),
    );

    const businessUnitToUse = businessUnit === "all" ? null : businessUnit;

    const ordersInRangeRaw = allOrdersSafe.filter(
      (o: any) => withinRange(o?.created_at) && !isVoidedOrderStatus(o?.status),
    );

    const orderMatchesBusinessUnit = (order: any) => {
      if (!businessUnitToUse && selectedMenuItemId === "all") return true;
      if (selectedMenuItemId !== "all") {
        return (
          getOrderSubtotalForUnitAndMenuItem(
            order,
            businessUnitToUse,
            selectedMenuItemId,
            menuMainCategoryById,
          ) > 0
        );
      }
      if (!businessUnitToUse) return true;
      return (
        getOrderSubtotalForUnit(
          order,
          businessUnitToUse,
          menuMainCategoryById,
        ) > 0
      );
    };

    const ordersInRange = ordersInRangeRaw.filter(orderMatchesBusinessUnit);

    const ordersInRangeAllStatuses = allOrdersSafe
      .filter((o: any) => withinRange(o?.created_at))
      .filter(orderMatchesBusinessUnit);

    const paymentsInRange = allPaymentsSafe.filter((p: any) => {
      if (!withinRange(p?.created_at)) return false;
      if (!isPaidPaymentStatus(p?.status)) return false;
      const oid = normalizeId(p?.order_id);
      if (!oid) return true;
      return !invalidOrderIdSet.has(oid);
    });

    const paymentsInRangeDeduped = dedupePaidPaymentsByOrder(paymentsInRange);

    const getPaymentAmount = (payment: any) => {
      if (!payment) return 0;
      const amt = parseFloat(payment?.amount);
      return Number.isFinite(amt) ? amt : 0;
    };

    const paymentsInRangeDedupedFiltered = paymentsInRangeDeduped.filter(
      (p: any) => {
        const oid = p?.order_id != null ? p.order_id : null;
        if ((oid === "")) return false;
        const order = orderById.get(String(oid)) || null;
        if (!order) return false;
        return (
          getOrderSubtotalForUnitAndMenuItem(
            order,
            businessUnitToUse,
            selectedMenuItemId,
            menuMainCategoryById,
          ) > 0
        );
      },
    );

    const recentOrdersInRange = ordersInRange
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b?.created_at || 0).getTime() -
          new Date(a?.created_at || 0).getTime(),
      )
      .slice(0, 5);

    const recentPaymentsInRange = paymentsInRangeDedupedFiltered
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b?.created_at || 0).getTime() -
          new Date(a?.created_at || 0).getTime(),
      )
      .slice(0, 5);

    const rangeOrdersTotal = ordersInRange.reduce(
      (sum: number, order: any) =>
        sum +
        getOrderSubtotalForUnitAndMenuItem(
          order,
          businessUnitToUse,
          selectedMenuItemId,
          menuMainCategoryById,
        ),
      0,
    );

    const rangePaidOrderIdSet = new Set(
      paymentsInRangeDeduped
        .map((p: any) => normalizeId(p?.order_id))
        .filter(Boolean),
    );

    const rangePaidTotal = paymentsInRangeDedupedFiltered.reduce(
      (sum: number, payment: any) => sum + getPaymentAmount(payment),
      0,
    );

    const rangeUnpaidTotal = ordersInRange
      .filter((o: any) => {
        const status = String(o?.status || "")
          .trim()
          .toLowerCase();
        const paymentStatus = String(o?.payment_status || "")
          .trim()
          .toLowerCase();
        if (status === "paid" || paymentStatus === "paid") return false;
        const oid = normalizeId(o?.id);
        if (!oid) return true;
        return !rangePaidOrderIdSet.has(oid);
      })
      .reduce(
        (sum: number, order: any) =>
          sum +
          getOrderSubtotalForUnitAndMenuItem(
            order,
            businessUnitToUse,
            selectedMenuItemId,
            menuMainCategoryById,
          ),
        0,
      );

    const rangePaidDeletedOrdersTotal = ordersInRangeAllStatuses
      .filter((o: any) => {
        const oid = normalizeId(o?.id);
        const status = String(o?.status || "")
          .trim()
          .toLowerCase();
        const paymentStatus = String(o?.payment_status || "")
          .trim()
          .toLowerCase();
        if (isVoidedOrderStatus(status)) return true;
        if (status === "paid" || paymentStatus === "paid") return true;
        if (oid && rangePaidOrderIdSet.has(oid)) return true;
        return false;
      })
      .reduce(
        (sum: number, order: any) =>
          sum +
          getOrderSubtotalForUnitAndMenuItem(
            order,
            businessUnitToUse,
            selectedMenuItemId,
            menuMainCategoryById,
          ),
        0,
      );

    return {
      orderById,
      ordersInRange,
      paymentsInRangeDedupedFiltered,
      recentOrdersInRange,
      recentPaymentsInRange,
      rangeOrdersTotal,
      rangePaidTotal,
      rangeUnpaidTotal,
      rangePaidDeletedOrdersTotal,
      getOrderSubtotalForUnitAndMenuItem,
      getPaymentAmount,
    };
  }, [dashboardData, businessUnit, selectedMenuItemId, withinRange]);
};
