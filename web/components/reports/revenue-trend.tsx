import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { birr } from "@/lib/format";
import type { RevenueTrendPoint } from "@/lib/reports";

export function RevenueTrend({ points }: { points: RevenueTrendPoint[] }) {
  const maxRevenue = Math.max(...points.map((point) => point.revenue), 1);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Revenue Trend</CardTitle>
        <CardDescription>Paid sales by business day</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {points.length > 0 ? (
          <div className="flex h-64 items-end gap-2 border-b border-l px-3 pb-4">
            {points.map((point) => (
              <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end justify-center">
                  <div
                    className="bg-primary w-full max-w-10 rounded-t-md"
                    style={{ height: `${Math.max(8, (point.revenue / maxRevenue) * 100)}%` }}
                    title={birr(point.revenue)}
                  />
                </div>
                <div className="text-muted-foreground w-full truncate text-center text-[10px] font-bold">
                  {point.label}
                </div>
                <div className="text-muted-foreground text-[10px]">{point.orders}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/20 text-muted-foreground flex h-64 items-center justify-center rounded-md border border-dashed text-xs font-bold">
            No paid revenue found for the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
