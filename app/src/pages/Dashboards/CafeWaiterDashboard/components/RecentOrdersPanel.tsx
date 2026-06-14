import { uuidToDisplayId, formatOrderNumber } from "@/lib/utils";
import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatOrderItemsPreview, normalizeStatus } from '../utils';

interface RecentOrdersPanelProps {
  orders: any[];
}

export const RecentOrdersPanel: React.FC<RecentOrdersPanelProps> = ({ orders }) => {
  const filteredRecentOrders = Array.isArray(orders) ? orders : [];

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Recent Table Orders</CardTitle>
        <CardDescription>Overview of your waitered table bookings</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {filteredRecentOrders.length > 0 ? (
          filteredRecentOrders
            .slice()
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8)
            .map((order: any) => {
              const st = normalizeStatus(order.status);
              const pst = normalizeStatus(order.payment_status);
              const isCanceled = st === 'deleted' || st === 'cancelled' || st === 'canceled';
              const displayStatus = pst === 'paid' ? 'paid' : (st || order.status);

              return (
                <div
                  key={order.id}
                  className={`border rounded-2xl p-4 transition-colors hover:bg-muted/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCanceled ? 'opacity-60 bg-destructive/5' : ''
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="font-extrabold text-sm text-foreground">
                        {order.order_type_label || (order.table_number ? `Table ${order.table_number}` : 'Take Away')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Order {formatOrderNumber(order)}
                      </span>
                      {isCanceled ? (
                        <Badge variant="destructive" className="text-[9px] uppercase py-0 px-2">
                          Canceled
                        </Badge>
                      ) : (
                        <Badge variant={displayStatus === 'completed' || displayStatus === 'paid' ? 'success' : displayStatus === 'ready' ? 'info' : 'warning'} className="text-[9px] capitalize py-0 px-2">
                          {displayStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(order.created_at).toLocaleString()}
                      {Array.isArray(order.items) ? ` • ${order.items.length} items` : ''}
                    </p>
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <p className="text-xs text-foreground font-bold truncate">
                        {formatOrderItemsPreview(order.items)}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-base font-black text-foreground">
                      {(parseFloat(order.total_amount) || 0).toLocaleString()} Birr
                    </p>
                  </div>
                </div>
              );
            })
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            No recent orders in this range
          </div>
        )}
      </CardContent>
    </Card>
  );
};
