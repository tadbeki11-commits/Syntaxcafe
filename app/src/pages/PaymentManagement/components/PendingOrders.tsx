import { uuidToDisplayId } from "@/lib/utils";
import React from 'react';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PendingOrderRecord } from '../types';

interface PendingOrdersProps {
  ordersForPayment: PendingOrderRecord[];
}

export const PendingOrders: React.FC<PendingOrdersProps> = ({ ordersForPayment }) => {
  if (ordersForPayment.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Pending Payments</CardTitle>
        <Badge variant="warning">{ordersForPayment.length} Orders</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ordersForPayment.map(order => (
            <div
              key={order.id}
              className="border border-warning/30 rounded-xl p-3 bg-warning/8 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">Order #{uuidToDisplayId(order.id)}</span>
                  <Badge variant="info" className="text-[10px]">{order.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.table_number && `Table ${order.table_number} · `}
                  {new Date(order.updated_at || order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-success text-sm">
                  {parseFloat(String(order.total_amount || 0)).toLocaleString()} Birr
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toast('Open in Cashier Dashboard to process payment')}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingOrders;
