"use client";

import { useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { birr } from "@/lib/format";
import {
  PERIOD_LABELS,
  calculatePeriodStats,
  type SourceData,
  type StatsPeriod,
} from "@/lib/reports";

const PERIODS: StatsPeriod[] = ["today", "month", "year"];

export function ReportsStats({ source, unit }: { source: SourceData; unit: string }) {
  const [period, setPeriod] = useState<StatsPeriod>("today");

  const stats = useMemo(
    () => calculatePeriodStats(source.orders, source.payments, source.menuItems, unit, period),
    [source, unit, period],
  );

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold">{PERIOD_LABELS[period]} Performance</h3>
          </div>
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
