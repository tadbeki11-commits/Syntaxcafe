"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUpIcon,
  ClockIcon,
  ReceiptTextIcon,
  WalletIcon,
  CoffeeIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Orders, Payments, Menu } from "@/lib/resources";
import { birr } from "@/lib/format";
import { salesSplit } from "@/lib/profit";
import {
  getItemSubtotal,
  isVoidedOrderStatus,
  makeGetItemDepartment,
  makeIsPaidOrder,
  normalizeId,
  normalizeStatus,
} from "@/lib/reports";

// The F&B overview is the F&B manager's landing page: a branch-scoped snapshot
// of food-and-beverage sales, the items driving them and how revenue splits
// across units (café / barista / restaurant). Numbers reuse the same paid-order
// detection as the Reports and Items Sold pages so they reconcile.

type Period = "today" | "week" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

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

type ItemRow = { item: string; unit: string; qty: number; revenue: number };
type UnitRow = { unit: string; revenue: number };

const UNIT_LABELS: Record<string, string> = {
  cafe: "Café",
  barista: "Barista",
  restaurant: "Restaurant",
  uncategorized: "Uncategorized",
};
const unitLabel = (u: string) => UNIT_LABELS[u] ?? u;

export default function FbOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>("today");

  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const load = async () => {
    const [ord, pay, menu] = await Promise.all([
      Orders.list().catch(() => []),
      Payments.history().catch(() => []),
      Menu.items().catch(() => []),
    ]);
    setOrders(Array.isArray(ord) ? ord : []);
    setPayments(Array.isArray(pay) ? pay : []);
    setMenuItems(Array.isArray(menu) ? menu : []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e: any) {
        toast.error(e.message || "Failed to load F&B overview");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const range = useMemo(() => {
    const now = new Date();
    const to = endOfLocalDay(now);
    const from = startOfLocalDay(now);
    if (period === "week") from.setDate(from.getDate() - 6);
    if (period === "month") from.setDate(from.getDate() - 29);
    return { from, to };
  }, [period]);

  const getItemDepartment = useMemo(
    () => makeGetItemDepartment(menuItems),
    [menuItems],
  );

  const { sales, paidOrdersInRange } = useMemo(() => {
    const { from, to } = range;
    const split = salesSplit(orders, payments, from, to);

    const paidPayments = payments.filter(
      (p) => normalizeStatus(p?.status) === "paid",
    );
    const paidOrderIdSet = new Set(
      paidPayments.map((p) => normalizeId(p?.order_id)).filter(Boolean),
    );
    const isPaid = makeIsPaidOrder(paidOrderIdSet);

    const within = (iso: any) => {
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) return false;
      return dt >= from && dt <= to;
    };

    const inRange = orders.filter(
      (o) =>
        !isVoidedOrderStatus(o?.status) &&
        isPaid(o) &&
        within(o?.created_at || o?.updated_at),
    );
    return { sales: split, paidOrdersInRange: inRange };
  }, [orders, payments, range]);

  const { topItems, unitMix } = useMemo(() => {
    const itemMap = new Map<string, ItemRow>();
    const unitMap = new Map<string, UnitRow>();

    for (const o of paidOrdersInRange) {
      const orderFallback = String(o?.type || "").trim().toLowerCase();
      const fallbackDept = orderFallback === "bakery" ? "cafe" : orderFallback;
      const items = Array.isArray(o?.items) ? o.items : [];
      for (const it of items) {
        const unit =
          getItemDepartment(it) || fallbackDept || "uncategorized";
        const name = String(it?.menu_item_name || it?.name || "").trim();
        if (!name) continue;
        const qty = parseInt(it?.quantity, 10) || 0;
        const revenue = getItemSubtotal(it);
        const rev = Number.isFinite(revenue) ? revenue : 0;

        const key = `${unit}__${name}`;
        const prev =
          itemMap.get(key) || { item: name, unit, qty: 0, revenue: 0 };
        prev.qty += qty;
        prev.revenue += rev;
        itemMap.set(key, prev);

        const u = unitMap.get(unit) || { unit, revenue: 0 };
        u.revenue += rev;
        unitMap.set(unit, u);
      }
    }

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    const unitMix = Array.from(unitMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
    return { topItems, unitMix };
  }, [paidOrdersInRange, getItemDepartment]);

  const orderCount = paidOrdersInRange.length;
  const avgOrder = orderCount > 0 ? sales.paid / orderCount : 0;
  const unitTotal = unitMix.reduce((s, u) => s + u.revenue, 0);

  const kpis = [
    {
      label: "F&B revenue",
      value: sales.paid,
      hint: "Collected",
      icon: TrendingUpIcon,
      valueClass: "text-emerald-600 dark:text-emerald-500",
    },
    {
      label: "Unpaid sales",
      value: sales.unpaid,
      hint: "Outstanding",
      icon: ClockIcon,
      valueClass: "text-amber-600 dark:text-amber-500",
    },
    {
      label: "Avg. order",
      value: avgOrder,
      hint: `${orderCount} paid order${orderCount === 1 ? "" : "s"}`,
      icon: WalletIcon,
      valueClass: "",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="F&B Overview"
        description="Food & beverage performance for your branch."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}>
            <RefreshCwIcon
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? "default" : "outline"}
            onClick={() => setPeriod(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {c.label}
              </CardTitle>
              <c.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <div className={`text-2xl font-semibold ${c.valueClass}`}>
                    {birr(c.value)}
                  </div>
                  <p className="text-muted-foreground text-xs">{c.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CoffeeIcon className="size-4" /> Top selling items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : topItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground py-8 text-center">
                      No paid F&B sales in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  topItems.map((r) => (
                    <TableRow key={`${r.unit}-${r.item}`}>
                      <TableCell className="font-medium">{r.item}</TableCell>
                      <TableCell>
                        <Badge variant="muted" className="capitalize">
                          {unitLabel(r.unit)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.qty}</TableCell>
                      <TableCell className="text-right">
                        {birr(r.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))
            ) : unitMix.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet.</p>
            ) : (
              unitMix.map((u) => {
                const pct =
                  unitTotal > 0 ? Math.round((u.revenue / unitTotal) * 100) : 0;
                return (
                  <div key={u.unit} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{unitLabel(u.unit)}</span>
                      <span className="text-muted-foreground">
                        {birr(u.revenue)} · {pct}%
                      </span>
                    </div>
                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <ReceiptTextIcon className="size-3.5" />
        Showing collected (paid) food &amp; beverage sales for the selected
        branch. Use Items Sold and Reports for a full breakdown.
      </p>
    </div>
  );
}
