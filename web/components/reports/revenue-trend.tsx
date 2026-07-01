"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { birr } from "@/lib/format";
import type { RevenueTrendPoint } from "@/lib/reports";

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--primary)" },
  orders: { label: "Orders", color: "var(--chart-2)" },
} satisfies ChartConfig;

const compact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function RevenueTrend({ points }: { points: RevenueTrendPoint[] }) {
  const total = points.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Revenue Trend</CardTitle>
        <CardDescription>
          Paid sales by business day · {birr(total)} total
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {points.length > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickMargin={4}
                tickFormatter={(v) => compact(Number(v))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground capitalize">{name}</span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {name === "revenue" ? birr(Number(value)) : Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="bg-muted/20 text-muted-foreground flex h-64 items-center justify-center rounded-md border border-dashed text-xs font-medium">
            No paid revenue found for the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
