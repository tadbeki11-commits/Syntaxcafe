import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { birr } from "@/lib/format";
import type { HourlyPerformanceItem } from "@/lib/reports";

export function HourlyPerformance({ items }: { items: HourlyPerformanceItem[] }) {
  const maxRevenue = Math.max(...items.map((item) => item.revenue), 1);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Hourly Performance</CardTitle>
        <CardDescription>Busiest paid sales windows</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
          {items.length > 0 ? (
            items.map((item) => (
              <div key={item.hour} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span>{item.hour}</span>
                  <span>{birr(item.revenue)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-muted h-2 flex-1 rounded-full">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-16 text-right text-[10px]">
                    {item.orders} orders
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-12 text-center text-xs font-bold">
              No hourly sales data in the selected window.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
