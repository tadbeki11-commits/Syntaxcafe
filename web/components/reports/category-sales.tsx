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
import type { CategorySalesItem } from "@/lib/reports";

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--primary)" },
} satisfies ChartConfig;

const compact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function CategorySales({ items }: { items: CategorySalesItem[] }) {
  const data = items.map((item) => ({
    ...item,
    name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
  }));

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Category Sales</CardTitle>
        <CardDescription>Revenue and quantity by menu category</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: Math.max(180, data.length * 38) }}>
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="revenue"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => compact(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={96}
                tickMargin={4}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <div className="flex w-full flex-col gap-0.5">
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {birr(Number(value))}
                        </span>
                        <span className="text-muted-foreground">
                          {(item?.payload as any)?.quantity} sold
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-muted-foreground py-16 text-center text-xs font-medium">
            No category sales in the selected window.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
