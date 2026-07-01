"use client";

import { useMemo } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function PaymentMethodsBreakdown({
  paymentMethods,
}: {
  paymentMethods: Record<string, number>;
}) {
  const { data, total, config } = useMemo(() => {
    const entries = Object.entries(paymentMethods).sort((a, b) => b[1] - a[1]);
    const sum = entries.reduce((acc, [, count]) => acc + count, 0);
    const cfg: ChartConfig = {};
    const rows = entries.map(([method, count], i) => {
      const key = method.replace(/[^a-z0-9]/gi, "_");
      const label = method.replace(/_/g, " ");
      cfg[key] = { label: label.charAt(0).toUpperCase() + label.slice(1), color: SLICE_COLORS[i % SLICE_COLORS.length] };
      return {
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count,
        fill: SLICE_COLORS[i % SLICE_COLORS.length],
      };
    });
    return { data: rows, total: sum, config: cfg };
  }, [paymentMethods]);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Payment Channel Breakdown</CardTitle>
        <CardDescription>Share of settled transactions by method</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length > 0 ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ChartContainer config={config} className="aspect-square h-52 w-52 shrink-0">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      nameKey="key"
                      formatter={(value, _name, item) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{(item?.payload as any)?.label}</span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {Number(value).toLocaleString()} ({((Number(value) / total) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie data={data} dataKey="count" nameKey="key" innerRadius={58} outerRadius={82} paddingAngle={2}>
                  {data.map((slice) => (
                    <Cell key={slice.key} fill={slice.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox)) return null;
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                            {total.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                            transactions
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <ul className="w-full flex-1 space-y-2.5">
              {data.map((slice) => {
                const pct = total > 0 ? (slice.count / total) * 100 : 0;
                return (
                  <li key={slice.key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: slice.fill }} />
                      <span className="truncate font-medium">{slice.label}</span>
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono tabular-nums">
                      {slice.count} · {pct.toFixed(1)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground py-16 text-center text-xs font-medium">
            No transactions settled in the selected window.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
