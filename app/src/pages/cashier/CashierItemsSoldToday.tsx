import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Printer, Coffee, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/application';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatsCard from '@/components/common/StatsCard';
import EmptyState from '@/components/common/EmptyState';
import {
  getApproximateServerDate,
  getApproximateServerDateString,
} from '@/shared/utils/serverTime';
import { printItemsSoldReport, ItemsSoldRow } from '@/utils/receiptPrinter';

const normalizeStatus = (s: string) => String(s || '').trim().toLowerCase();

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

/**
 * Cashier view of the items sold *today only* — aggregated by menu item across
 * all settled orders, with a thermal-print button for an end-of-day snapshot.
 */
export const CashierItemsSoldToday: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const menuMainCategoryById = useMemo(() => {
    const map: { [key: number]: string } = {};
    (Array.isArray(menuItems) ? menuItems : []).forEach((it) => {
      const id = it?.id != null ? it.id : null;
      if (id === '' || id == null) return;
      const main = String(it?.main_category || '').trim().toLowerCase();
      if (!main) return;
      map[id as number] = main;
    });
    return map;
  }, [menuItems]);

  const getItemDepartment = useCallback(
    (item: any) => {
      const menuId = item?.menu_item_id != null ? item.menu_item_id : null;
      if (menuId === null || menuId === undefined || menuId === '') return '';
      return String(menuMainCategoryById[menuId as number] || '').trim().toLowerCase();
    },
    [menuMainCategoryById],
  );

  const { todaysOrders, paidCount } = useMemo(() => {
    const ord = Array.isArray(orders) ? orders : [];
    const pay = Array.isArray(payments) ? payments : [];

    const paid = pay.filter((p) => normalizeStatus(p?.status) === 'paid');
    const paidOrderIdSet = new Set(
      paid.map((p) => String(p?.order_id ?? '')).filter(Boolean),
    );

    const isPaidOrder = (o: any) => {
      const id = o?.id != null ? String(o.id) : '';
      if (id && paidOrderIdSet.has(id)) return true;
      const st = normalizeStatus(o?.status);
      const pst = normalizeStatus(o?.payment_status);
      return st === 'paid' || pst === 'paid' || st === 'completed' || st === 'done';
    };

    const now = getApproximateServerDate();
    const from = startOfLocalDay(now);
    const to = endOfLocalDay(now);

    const withinToday = (o: any) => {
      const dt = toDate(o?.created_at || o?.updated_at);
      if (!dt) return false;
      return dt >= from && dt <= to;
    };

    return {
      paidCount: paid.length,
      todaysOrders: ord.filter(isPaidOrder).filter(withinToday),
    };
  }, [orders, payments]);

  const itemsRows = useMemo<ItemsSoldRow[]>(() => {
    const map = new Map<string, ItemsSoldRow>();

    for (const o of todaysOrders) {
      const items = Array.isArray(o?.items) ? o.items : [];
      for (const it of items) {
        const name = String(it?.menu_item_name || it?.name || '').trim();
        if (!name) continue;
        const unit = getItemDepartment(it);
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
        revenue: Math.round((r.revenue + Number.EPSILON) * 100) / 100,
      }))
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }, [todaysOrders, getItemDepartment]);

  const counts = useMemo(() => {
    const foodQty = itemsRows
      .filter((r) => r.unit === 'cafe' || r.unit === 'restaurant')
      .reduce((sum, r) => sum + (parseInt(String(r.qtySold), 10) || 0), 0);
    const softQty = itemsRows
      .filter((r) => r.unit === 'barista')
      .reduce((sum, r) => sum + (parseInt(String(r.qtySold), 10) || 0), 0);
    const totalRevenue = itemsRows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
    return { foodQty, softQty, totalRevenue };
  }, [itemsRows]);

  const fetchData = useCallback(async () => {
    try {
      const [ordersResp, paymentsResp, menuResp] = await Promise.all([
        api.orders.getAll().catch(() => null),
        api.payments.getAll().catch(() => null),
        api.menu.getAll().catch(() => null),
      ]);

      const ord =
        (ordersResp?.data?.data as any)?.orders ??
        (ordersResp as any)?.data?.orders ??
        ordersResp?.data?.data ??
        [];
      const pay =
        (paymentsResp?.data?.data as any)?.payments ??
        (paymentsResp as any)?.data?.payments ??
        paymentsResp?.data?.data ??
        [];
      const menu =
        (menuResp?.data?.data as any)?.menuItems ??
        (menuResp?.data?.data as any)?.items ??
        (menuResp as any)?.data?.menuItems ??
        (menuResp as any)?.data?.items ??
        menuResp?.data?.data ??
        [];

      setOrders(Array.isArray(ord) ? ord : []);
      setPayments(Array.isArray(pay) ? pay : []);
      setMenuItems(Array.isArray(menu) ? menu : []);
    } catch (e) {
      toast.error('Failed to load items sold today');
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

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await printItemsSoldReport(itemsRows, {
        periodLabel: `Today · ${getApproximateServerDateString()}`,
        ordersCount: todaysOrders.length,
      });
    } catch (e) {
      console.error('Failed to print items sold report:', e);
      toast.error('Failed to print report');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Items Sold Today"
        description="Everything sold today, aggregated by item — ready to print"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={printing || itemsRows.length === 0}>
              <Printer className={`w-4 h-4 mr-2 ${printing ? 'animate-pulse' : ''}`} />
              Print
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Food Items Sold"
          value={counts.foodQty}
          icon={<Coffee className="w-5 h-5" />}
          variant="success"
        />
        <StatsCard
          title="Total Beverages Sold"
          value={counts.softQty}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="info"
        />
        <StatsCard
          title="Total Revenue"
          value={`${Number(counts.totalRevenue || 0).toLocaleString()} Birr`}
          variant="default"
        />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Items Sold Today</CardTitle>
            <CardDescription>{itemsRows.length} distinct item types</CardDescription>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Orders: {todaysOrders.length} · Settled: {paidCount}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Unit</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState
                      icon={<Coffee />}
                      title="No items sold today"
                      description="Nothing has been sold yet today."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                itemsRows.map((r, idx) => (
                  <TableRow key={`${r.unit}-${r.item}-${idx}`}>
                    <TableCell className="capitalize text-xs text-muted-foreground font-semibold">
                      {r.unit}
                    </TableCell>
                    <TableCell className="font-semibold text-sm text-foreground">
                      {r.item}
                    </TableCell>
                    <TableCell className="font-bold text-sm">{r.qtySold}</TableCell>
                    <TableCell className="text-right font-extrabold text-success">
                      {Number(r.revenue || 0).toLocaleString()} Birr
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashierItemsSoldToday;
