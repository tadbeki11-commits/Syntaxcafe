import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { birr } from "@/lib/format";
import type { CategorySalesItem } from "@/lib/reports";

export function CategorySales({ items }: { items: CategorySalesItem[] }) {
  const maxRevenue = Math.max(...items.map((item) => item.revenue), 1);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Category Sales</CardTitle>
        <CardDescription>Revenue and quantity by menu category</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
          {items.length > 0 ? (
            items.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="truncate capitalize">{item.name}</span>
                  <span className="shrink-0">{birr(item.revenue)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-muted h-2 flex-1 rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-16 text-right text-[10px]">
                    {item.quantity} sold
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-12 text-center text-xs font-bold">
              No category sales in the selected window.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
