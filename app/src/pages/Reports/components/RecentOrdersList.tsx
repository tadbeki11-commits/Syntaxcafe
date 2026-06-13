import { uuidToDisplayId } from "@/lib/utils";
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecentOrder } from '../types';

interface RecentOrdersListProps {
  recentOrders: RecentOrder[];
}

export const RecentOrdersList: React.FC<RecentOrdersListProps> = ({ recentOrders }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Recent Orders</CardTitle>
        <CardDescription>Latest order status logs</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {recentOrders.slice(0, 5).map((order) => (
            <div 
              key={order.id} 
              className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/10 transition-colors font-semibold"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-foreground">
                    Order #{uuidToDisplayId(order.id)}
                  </span>
                  <Badge variant="secondary" className="text-[9px] capitalize py-0 px-1.5">
                    {String(order.type || '').trim().toLowerCase() === 'bakery' ? 'cafe' : order.type}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground font-bold">
                  Waiter: {String(order?.waiter_name || order?.employee_name || '').trim() || (order?.employee_id != null ? `#${order.employee_id}` : '—')}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-extrabold text-xs text-foreground">
                  {parseFloat(String(order.total_amount)).toLocaleString()} Birr
                </p>
                <Badge 
                  variant={
                    order?.derived_status === 'paid' 
                      ? 'success' 
                      : order?.derived_status === 'voided' 
                      ? 'destructive' 
                      : 'warning'
                  } 
                  className="capitalize text-[9px] py-0 px-1.5"
                >
                  {order.derived_status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentOrdersList;
