import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/application';
import toast from 'react-hot-toast';
import {
  getApproximateServerDate,
  getApproximateServerDateString,
} from '@/shared/utils/serverTime';
import { AggregatedItemRow, ItemSalesCounts } from '../types';

export const usePaymentsItemsData = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const [timeFilter, setTimeFilter] = useState('today');
  const [customMode, setCustomMode] = useState<'specific' | 'range'>('specific');
  const [customDate, setCustomDate] = useState(() => getApproximateServerDateString());
  const [customFrom, setCustomFrom] = useState(() => getApproximateServerDateString());
  const [customTo, setCustomTo] = useState(() => getApproximateServerDateString());

  const [unitFilter, setUnitFilter] = useState('all');

  const normalizeStatus = (s: string) => String(s || '').trim().toLowerCase();

  const menuMainCategoryById = useMemo(() => {
    const map: { [key: number]: string } = {};
    (Array.isArray(menuItems) ? menuItems : []).forEach((it) => {
      const id = it?.id != null ? it.id : null;
      if ((id === "")) return;
      const main = String(it?.main_category || '').trim().toLowerCase();
      if (!main) return;
      map[id as number] = main;
    });
    return map;
  }, [menuItems]);

  const getItemDepartment = useCallback((item: any, orderFallbackType: string) => {

    const explicitMain = String(item?.main_category || '').trim().toLowerCase();
    const menuId = item?.menu_item_id != null ? item.menu_item_id : null;
    const mapped = (menuId !== null && menuId !== undefined && menuId !== "") ? String(menuMainCategoryById[menuId as number] || '').trim().toLowerCase() : '';
    return mapped;

  }, [menuMainCategoryById]);

  const getItemSubtotal = (it: any) => {
    const qty = parseInt(it?.quantity, 10) || 0;
    const subtotal = parseFloat(it?.subtotal);
    if (Number.isFinite(subtotal)) return subtotal;
    const unitPrice = parseFloat(it?.unit_price);
    if (Number.isFinite(unitPrice) && qty > 0) return unitPrice * qty;
    const price = parseFloat(it?.price);
    if (Number.isFinite(price) && qty > 0) return price * qty;
    return 0;
  };

  const startOfLocalDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const endOfLocalDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  const toDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const { filteredOrders, paidPayments } = useMemo(() => {
    const ord = Array.isArray(orders) ? orders : [];
    const pay = Array.isArray(payments) ? payments : [];

    const paid = pay.filter((p) => normalizeStatus(p?.status) === 'paid');
    const paidOrderIdSet = new Set(paid.map((p) => String(p?.order_id ?? '')).filter(Boolean));

    const isPaidOrder = (o: any) => {
      const id = o?.id != null ? String(o.id) : '';
      if (id && paidOrderIdSet.has(id)) return true;
      const st = normalizeStatus(o?.status);
      const pst = normalizeStatus(o?.payment_status);
      return st === 'paid' || pst === 'paid' || st === 'completed' || st === 'done';
    };

    const paidOrders = ord.filter(isPaidOrder);

    const now = getApproximateServerDate();
    const todayFrom = startOfLocalDay(now);
    const todayTo = endOfLocalDay(now);

    const weekFrom = new Date(todayFrom);
    weekFrom.setDate(weekFrom.getDate() - 6);

    const monthFrom = new Date(todayFrom);
    monthFrom.setDate(monthFrom.getDate() - 29);

    let from: Date | null = null;
    let to: Date | null = null;

    if (timeFilter === 'today') {
      from = todayFrom;
      to = todayTo;
    } else if (timeFilter === 'week') {
      from = weekFrom;
      to = todayTo;
    } else if (timeFilter === 'month') {
      from = monthFrom;
      to = todayTo;
    } else if (timeFilter === 'custom') {
      if (customMode === 'specific') {
        from = customDate ? startOfLocalDay(new Date(customDate)) : null;
        to = customDate ? endOfLocalDay(new Date(customDate)) : null;
      } else {
        from = customFrom ? startOfLocalDay(new Date(customFrom)) : null;
        to = customTo ? endOfLocalDay(new Date(customTo)) : null;
      }
    }

    const within = (o: any) => {
      if (!from && !to) return true;
      const dt = toDate(o?.created_at || o?.updated_at);
      if (!dt) return false;
      if (from && dt < from) return false;
      if (to && dt > to) return false;
      return true;
    };

    return {
      paidPayments: paid,
      filteredOrders: paidOrders.filter(within)
    };
  }, [customDate, customFrom, customMode, customTo, orders, payments, timeFilter]);

  const viewingLabel = useMemo(() => {
    if (timeFilter === 'all') return 'All';
    if (timeFilter === 'today') return 'Today';
    if (timeFilter === 'week') return 'Week';
    if (timeFilter === 'month') return 'Month';
    if (timeFilter === 'custom') {
      if (customMode === 'specific') {
        if (!customDate) return 'Custom';
        try {
          return new Date(customDate).toLocaleDateString();
        } catch {
          return 'Custom';
        }
      }
      if (!customFrom && !customTo) return 'Custom';
      return `${customFrom || '...'} to ${customTo || '...'}`;
    }
    return 'Today';
  }, [customDate, customFrom, customMode, customTo, timeFilter]);

  const itemsRows = useMemo(() => {
    const map = new Map<string, any>();

    for (const o of filteredOrders) {
      const orderType = String(o?.type || '').trim().toLowerCase();
      const items = Array.isArray(o?.items) ? o.items : [];

      for (const it of items) {
        const unit = getItemDepartment(it, orderType);
        if (unitFilter !== 'all' && unit !== unitFilter) continue;

        const name = String(it?.menu_item_name || it?.name || '').trim();
        if (!name) continue;

        const qty = parseInt(it?.quantity, 10) || 0;
        const revenue = getItemSubtotal(it);
        const key = `${unit}__${name}`;

        const prev = map.get(key) || { unit, item: name, qtySold: 0, revenue: 0 };
        prev.qtySold += qty;
        prev.revenue += Number.isFinite(revenue) ? revenue : 0;
        map.set(key, prev);
      }
    }

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        revenue: Math.round((r.revenue + Number.EPSILON) * 100) / 100
      }))
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0)) as AggregatedItemRow[];
  }, [filteredOrders, getItemDepartment, unitFilter]);

  const counts = useMemo(() => {
    const foodQty = itemsRows
      .filter((r) => r.unit === 'cafe' || r.unit === 'restaurant')
      .reduce((sum, r) => sum + (parseInt(String(r.qtySold), 10) || 0), 0);

    const softQty = itemsRows
      .filter((r) => r.unit === 'barista')
      .reduce((sum, r) => sum + (parseInt(String(r.qtySold), 10) || 0), 0);

    return { foodQty, softQty } as ItemSalesCounts;
  }, [itemsRows]);

  const fetchData = useCallback(async () => {
    try {
      const [ordersResp, paymentsResp, menuResp] = await Promise.all([
        api.orders.getAll().catch(() => null),
        api.payments.getAll().catch(() => null),
        api.menu.getAll().catch(() => null)
      ]);

      const ord = (ordersResp?.data?.data as any)?.orders ?? (ordersResp as any)?.data?.orders ?? ordersResp?.data?.data ?? [];
      const pay = (paymentsResp?.data?.data as any)?.payments ?? (paymentsResp as any)?.data?.payments ?? paymentsResp?.data?.data ?? [];
      const menu = (menuResp?.data?.data as any)?.menuItems ?? (menuResp?.data?.data as any)?.items ?? (menuResp as any)?.data?.menuItems ?? (menuResp as any)?.data?.items ?? menuResp?.data?.data ?? [];

      setOrders(Array.isArray(ord) ? ord : []);
      setPayments(Array.isArray(pay) ? pay : []);
      setMenuItems(Array.isArray(menu) ? menu : []);
    } catch (e) {
      toast.error('Failed to load payments items');
      setOrders([]);
      setPayments([]);
      setMenuItems([]);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    run();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return {
    loading,
    refreshing,
    orders,
    payments,
    timeFilter,
    setTimeFilter,
    customMode,
    setCustomMode,
    customDate,
    setCustomDate,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    unitFilter,
    setUnitFilter,
    viewingLabel,
    itemsRows,
    counts,
    paidPayments,
    handleRefresh
  };
};

export default usePaymentsItemsData;
