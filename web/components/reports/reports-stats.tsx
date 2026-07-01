"use client";

import { useMemo, useState } from "react";
import { BarChart2, CalendarRange } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { birr } from "@/lib/format";
import {
  PERIOD_LABELS,
  calculatePeriodStats,
  type SourceData,
  type StatsDateRange,
  type StatsPeriod,
} from "@/lib/reports";

const PERIODS: StatsPeriod[] = ["today", "month", "year"];

// Parse a `YYYY-MM-DD` value (from the date picker) into a local day boundary.
const parseLocalDateOnly = (ymd: string) => {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
};
const startLocal = (ymd: string) => {
  const p = parseLocalDateOnly(ymd);
  return p ? new Date(p.y, p.mo - 1, p.d, 0, 0, 0, 0) : null;
};
const endLocal = (ymd: string) => {
  const p = parseLocalDateOnly(ymd);
  return p ? new Date(p.y, p.mo - 1, p.d, 23, 59, 59, 999) : null;
};
const shortDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function ReportsStats({
  source,
  unit,
  dateFrom = "",
  dateTo = "",
}: {
  source: SourceData;
  unit: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [period, setPeriod] = useState<StatsPeriod>("today");

  const range = useMemo<StatsDateRange | null>(() => {
    if (!dateFrom && !dateTo) return null;
    return { from: dateFrom ? startLocal(dateFrom) : null, to: dateTo ? endLocal(dateTo) : null };
  }, [dateFrom, dateTo]);

  const hasRange = range !== null;

  const stats = useMemo(
    () => calculatePeriodStats(source.orders, source.payments, source.menuItems, unit, period, range),
    [source, unit, period, range],
  );

  const rangeLabel = useMemo(() => {
    if (!range) return "";
    const from = range.from ? shortDate(range.from) : null;
    const to = range.to ? shortDate(range.to) : null;
    if (from && to) return `${from} – ${to}`;
    if (from) return `From ${from}`;
    if (to) return `Through ${to}`;
    return "";
  }, [range]);

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold">
              {hasRange ? "Selected Range" : PERIOD_LABELS[period]} Performance
            </h3>
          </div>
          {hasRange ? (
            <div className="text-muted-foreground bg-muted inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium">
              <CalendarRange className="size-3.5" />
              {rangeLabel}
            </div>
          ) : (
            <div className="bg-muted inline-flex rounded-lg p-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    period === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Orders" value={stats.totalOrders} subtitle={`${stats.pendingOrders} pending`} />
          <Metric
            label="Paid Revenue"
            value={birr(stats.paidRevenue || 0)}
            subtitle="Paid orders only"
            accent="success"
          />
          <Metric label="Paid Orders" value={stats.paidOrders} subtitle={`${stats.voidedOrders} voided`} />
          <Metric label="Avg Paid Order" value={birr(stats.avgPaidOrderValue || 0)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  accent?: "success";
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p
        className={cn(
          "truncate text-2xl font-semibold",
          accent === "success" && "text-green-600 dark:text-green-400",
        )}>
        {value}
      </p>
      {subtitle && <p className="text-muted-foreground truncate text-xs">{subtitle}</p>}
    </div>
  );
}
