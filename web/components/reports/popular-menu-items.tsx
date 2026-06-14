import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { birr } from "@/lib/format";
import type { TopItem } from "@/lib/reports";

export function PopularMenuItems({
  topItems,
  topItemsPeriod,
  setTopItemsPeriod,
}: {
  topItems: TopItem[];
  topItemsPeriod: string;
  setTopItemsPeriod: (period: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
        <div>
          <CardTitle className="text-base">Popular Menu Items</CardTitle>
          <CardDescription>Most frequently bought dishes</CardDescription>
        </div>
        <select
          value={topItemsPeriod}
          onChange={(e) => setTopItemsPeriod(e.target.value)}
          className="border-input bg-background h-8 rounded-md border px-2 text-xs">
          <option value="selected_range">Selected range</option>
          <option value="this_week">This week</option>
          <option value="this_month">This month</option>
          <option value="all_time">All time</option>
        </select>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {topItems.length > 0 ? (
            topItems.map((item, index) => (
              <div
                key={item.name}
                className="hover:bg-muted/10 flex items-center justify-between rounded-xl border p-3 font-semibold transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full text-xs font-black">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-foreground text-xs font-extrabold">{item.name}</p>
                    <p className="text-muted-foreground text-[10px] font-bold">
                      {birr(item.revenue || 0)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black">
                  {item.sold} sold
                </Badge>
              </div>
            ))
          ) : (
            <div className="bg-muted/20 text-muted-foreground rounded-xl border border-dashed p-8 text-center text-xs font-bold">
              No item summary found for the selected filters and period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
