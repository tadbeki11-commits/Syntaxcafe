"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { birr } from "@/lib/format";
import type { HourlyPerformanceItem } from "@/lib/reports";

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-2)" },
} satisfies ChartConfig;

const compact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function HourlyPerformance({ items }: { items: HourlyPerformanceItem[] }) {
  const peak = items.reduce(
    (best, item) => (item.revenue > (best?.revenue ?? -1) ? item : best),
    undefined as HourlyPerformanceItem | undefined,
  );

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Hourly Performance</CardTitle>
        <CardDescription>
          Paid sales across the day{peak ? ` · peak ${peak.hour}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {items.length > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={items} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickMargin={4}
                tickFormatter={(v) => compact(Number(v))}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `${label}`}
                    formatter={(value, _name, item) => (
                      <div className="flex w-full flex-col gap-0.5">
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {birr(Number(value))}
                        </span>
                        <span className="text-muted-foreground">
                          {(item?.payload as any)?.orders} orders
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-muted-foreground py-16 text-center text-xs font-medium">
            No hourly sales data in the selected window.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
