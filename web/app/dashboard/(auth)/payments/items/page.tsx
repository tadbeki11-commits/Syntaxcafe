"use client";

import { useEffect, useMemo, useState } from "react";
import { Coffee, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  getItemSubtotal,
  makeGetItemDepartment,
  makeIsPaidOrder,
  normalizeId,
  normalizeStatus,
} from "@/lib/reports";

type AggregatedItemRow = {
  unit: string;
  item: string;
  qtySold: number;
  revenue: number;
};

const TIME_FILTERS = ["all", "today", "week", "month", "custom"] as const;
const UNIT_FILTERS = ["all", "cafe", "barista", "restaurant"] as const;

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

export default function PaymentsItemsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const [timeFilter, setTimeFilter] = useState<string>("today");
  const [customMode, setCustomMode] = useState<"specific" | "range">("specific");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [customDate, setCustomDate] = useState(today);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [unitFilter, setUnitFilter] = useState<string>("all");

  const fetchData = async () => {
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
        await fetchData();
      } catch (e: any) {
        toast.error(e.message || "Failed to load items sold");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const getItemDepartment = useMemo(
    () => makeGetItemDepartment(menuItems),
    [menuItems],
  );

  const { filteredOrders, paidPayments } = useMemo(() => {
    const paid = payments.filter((p) => normalizeStatus(p?.status) === "paid");
    const paidOrderIdSet = new Set(
      paid.map((p) => normalizeId(p?.order_id)).filter(Boolean),
    );
    const isPaidOrder = makeIsPaidOrder(paidOrderIdSet);
    const paidOrders = orders.filter(isPaidOrder);

    const now = new Date();
    const todayFrom = startOfLocalDay(now);
    const todayTo = endOfLocalDay(now);
    const weekFrom = new Date(todayFrom);
    weekFrom.setDate(weekFrom.getDate() - 6);
    const monthFrom = new Date(todayFrom);
    monthFrom.setDate(monthFrom.getDate() - 29);

    let from: Date | null = null;
    let to: Date | null = null;
    if (timeFilter === "today") {
      from = todayFrom;
      to = todayTo;
    } else if (timeFilter === "week") {
      from = weekFrom;
      to = todayTo;
    } else if (timeFilter === "month") {
      from = monthFrom;
      to = todayTo;
    } else if (timeFilter === "custom") {
      if (customMode === "specific") {
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

    return { paidPayments: paid, filteredOrders: paidOrders.filter(within) };
  }, [orders, payments, timeFilter, customMode, customDate, customFrom, customTo]);

  const itemsRows = useMemo<AggregatedItemRow[]>(() => {
    const map = new Map<string, AggregatedItemRow>();
    for (const o of filteredOrders) {
      const orderFallback = String(o?.type || "").trim().toLowerCase();
      const fallbackDept = orderFallback === "bakery" ? "cafe" : orderFallback;
      const items = Array.isArray(o?.items) ? o.items : [];
      for (const it of items) {
        const unit = getItemDepartment(it) || fallbackDept || "uncategorized";
        if (unitFilter !== "all" && unit !== unitFilter) continue;
        const name = String(it?.menu_item_name || it?.name || "").trim();
        if (!name) continue;
        const qty = parseInt(it?.quantity, 10) || 0;
        const revenue = getItemSubtotal(it);
        const key = `${unit}__${name}`;
        const prev =
          map.get(key) || { unit, item: name, qtySold: 0, revenue: 0 };
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
  }, [filteredOrders, getItemDepartment, unitFilter]);

  const counts = useMemo(() => {
    const foodQty = itemsRows
      .filter((r) => r.unit === "cafe" || r.unit === "restaurant")
      .reduce((sum, r) => sum + (r.qtySold || 0), 0);
    const softQty = itemsRows
      .filter((r) => r.unit === "barista")
      .reduce((sum, r) => sum + (r.qtySold || 0), 0);
    return { foodQty, softQty };
  }, [itemsRows]);

  const viewingLabel = useMemo(() => {
    if (timeFilter === "all") return "All";
    if (timeFilter === "today") return "Today";
    if (timeFilter === "week") return "Week";
    if (timeFilter === "month") return "Month";
    if (customMode === "specific") {
      return customDate ? new Date(customDate).toLocaleDateString() : "Custom";
    }
    return `${customFrom || "..."} to ${customTo || "..."}`;
  }, [timeFilter, customMode, customDate, customFrom, customTo]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Foods & Drinks Sold"
        description="Aggregated breakdown of individual sold items matching paid transactions."
        action={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap gap-1.5 border-b pb-2">
                {TIME_FILTERS.map((filter) => (
                  <Button
                    key={filter}
                    variant={timeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeFilter(filter)}
                    className="text-xs font-bold capitalize">
                    {filter}
                  </Button>
                ))}
              </div>

              {timeFilter === "custom" && (
                <div className="bg-muted/40 space-y-4 rounded-xl border p-4">
                  <div className="grid max-w-xs grid-cols-2 gap-2">
                    <Button
                      variant={customMode === "specific" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setCustomMode("specific")}
                      className="text-xs font-semibold">
                      Specific Date
                    </Button>
                    <Button
                      variant={customMode === "range" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setCustomMode("range")}
                      className="text-xs font-semibold">
                      Date Range
                    </Button>
                  </div>
                  {customMode === "specific" ? (
                    <Input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="max-w-xs"
                    />
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="max-w-[12rem]"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="max-w-[12rem]"
                      />
                    </div>
                  )}
                  <Badge variant="muted" className="text-xs font-semibold">
                    Viewing ledger for: {viewingLabel}
                  </Badge>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {UNIT_FILTERS.map((unit) => (
                  <Badge
                    key={unit}
                    onClick={() => setUnitFilter(unit)}
                    variant={unitFilter === unit ? "default" : "secondary"}
                    className="cursor-pointer px-2.5 py-1 text-[10px] font-bold capitalize">
                    {unit}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
                    Total Food Items Sold
                  </p>
                  <p className="text-2xl font-extrabold">{counts.foodQty.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs">Cafe & Restaurant aggregations</p>
                </div>
                <Coffee className="text-success size-6" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
                    Total Beverages Sold
                  </p>
                  <p className="text-2xl font-extrabold">{counts.softQty.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs">Barista beverage orders count</p>
                </div>
                <TrendingUp className="text-primary size-6" />
              </CardContent>
            </Card>
          </div>

          {/* Items table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <CardTitle className="text-base">Aggregated Items List</CardTitle>
                <CardDescription>
                  Matches {itemsRows.length} distinct item types
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Orders: {filteredOrders.length} · Settled: {paidPayments.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity Sold</TableHead>
                    <TableHead className="text-right">Accumulated Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-12 text-center text-sm">
                        No items found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemsRows.map((r, idx) => (
                      <TableRow key={`${r.unit}-${r.item}-${idx}`}>
                        <TableCell className="text-muted-foreground text-xs font-semibold capitalize">
                          {r.unit}
                        </TableCell>
                        <TableCell className="text-foreground text-sm font-semibold">
                          {r.item}
                        </TableCell>
                        <TableCell className="text-sm font-bold">{r.qtySold}</TableCell>
                        <TableCell className="text-success text-right font-extrabold">
                          {birr(r.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
