import { uuidToDisplayId } from "@/lib/utils";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '../utils';

interface OrderStreamPanelProps {
  orders: any[];
  getOrderSubtotal: (order: any) => number;
}

export const OrderStreamPanel: React.FC<OrderStreamPanelProps> = ({
  orders,
  getOrderSubtotal
}) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Live Order Stream</CardTitle>
          <CardDescription>Ongoing active orders and statuses</CardDescription>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate('/dashboard/orders')}
          className="text-xs font-bold"
        >
          View All
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {orders.length > 0 ? (
          orders.map((order: any) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/10 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-foreground">
                    #{uuidToDisplayId(order.id)}
                  </span>
                  <Badge
                    variant={
                      order.status === 'completed' || order.status === 'paid'
                        ? 'success'
                        : 'warning'
                    }
                    className="text-[9px] capitalize py-0 px-1.5"
                  >
                    {order.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {order.type === 'cafe' && order.table_number && `Table ${order.table_number} • `}
                  {formatDate(order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-xs text-foreground">
                  {formatCurrency(getOrderSubtotal(order))}
                </p>
                <Badge variant="secondary" className="text-[8px] uppercase py-0 px-1 font-bold">
                  {order.type}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            No active orders in this range
          </div>
        )}
      </CardContent>
    </Card>
  );
};
