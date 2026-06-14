import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { birr } from "@/lib/format";
import { formatOrderNumber } from "@/lib/utils";
import type { RecentOrder } from "@/lib/reports";

export function RecentOrdersList({ recentOrders }: { recentOrders: RecentOrder[] }) {
  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Recent Orders</CardTitle>
        <CardDescription>Latest order status logs</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="hover:bg-muted/10 flex items-center justify-between rounded-xl border p-3 font-semibold transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground text-xs font-extrabold">
                      Order {formatOrderNumber(order)}
                    </span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[9px] capitalize">
                      {String(order.type || "").trim().toLowerCase() === "bakery"
                        ? "cafe"
                        : order.type}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-[10px] font-bold">
                    Waiter:{" "}
                    {String(order?.waiter_name || order?.employee_name || "").trim() ||
                      (order?.employee_id != null ? `#${order.employee_id}` : "—")}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-foreground text-xs font-extrabold">
                    {birr(parseFloat(String(order.total_amount)))}
                  </p>
                  <Badge
                    variant={
                      order?.derived_status === "paid"
                        ? "success"
                        : order?.derived_status === "voided"
                          ? "destructive"
                          : "warning"
                    }
                    className="px-1.5 py-0 text-[9px] capitalize">
                    {order.derived_status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-12 text-center text-xs font-bold">
              No recent orders for the selected filters.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
