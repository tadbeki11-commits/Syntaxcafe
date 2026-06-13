import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { getApproximateServerDate } from '@/shared/utils/serverTime';

interface CheckoutTimelineProps {
  employeeOrders: any[];
  statsRange: string;
  normalizeStatus: (s: any) => string;
  formatOrderItemsPreview: (items: any[]) => string;
  formatCurrency: (val: any) => string;
}

export const CheckoutTimeline: React.FC<CheckoutTimelineProps> = ({
  employeeOrders,
  statsRange,
  normalizeStatus,
  formatOrderItemsPreview,
  formatCurrency
}) => {
  const filteredTimeline = useMemo(() => {
    const orders = Array.isArray(employeeOrders) ? employeeOrders : [];
    const now = getApproximateServerDate();
    let from: Date | null = null;
    let to: Date | null = null;

    if (statsRange === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (statsRange === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      to = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (statsRange === 'week') {
      from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
    } else if (statsRange === 'month') {
      from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
    }

    const rangeOrders = (from && to)
      ? orders.filter((o) => {
        const d = new Date(o.created_at);
        if (Number.isNaN(d.getTime())) return false;
        return d >= from! && d <= to!;
      })
      : orders;

    return rangeOrders
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [employeeOrders, statsRange]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="text-sm font-semibold text-foreground">
          Waiter Checkout Timeline
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">
          Latest operational transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[500px] flex-1 space-y-3 overflow-y-auto p-4">
        {filteredTimeline.length > 0 ? (
          filteredTimeline.map((order) => {
            const st = normalizeStatus(order.status);
            const pst = normalizeStatus(order.payment_status);
            const isCanceled =
              st === 'deleted' || st === 'cancelled' || st === 'canceled';
            const displayStatus = pst === 'paid' ? 'paid' : st || order.status;

            return (
              <div
                key={order.id}
                className={`space-y-2 rounded-lg border p-3.5 transition-colors hover:bg-muted/40 ${isCanceled ? 'border-destructive/30 bg-destructive/5' : 'bg-card'
                  }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        {order.order_type_label || (order.table_number ? `Table ${order.table_number}` : 'Take Away')}
                      </span>
                      {isCanceled ? (
                        <Badge variant="destructive" className="text-[10px] uppercase">
                          Cancelled
                        </Badge>
                      ) : (
                        <Badge
                          variant={displayStatus === 'paid' ? 'success' : 'secondary'}
                          className="text-[10px] uppercase"
                        >
                          {displayStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}{' '}
                      {Array.isArray(order.items)
                        ? ` • ${order.items.length} items`
                        : ''}
                    </div>
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <div className="mt-2 rounded-md border bg-muted/40 p-2 text-[10px] text-muted-foreground">
                        {formatOrderItemsPreview(order.items)}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right text-xs font-semibold text-foreground">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xs text-muted-foreground">
              No recent orders recorded in this range
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
