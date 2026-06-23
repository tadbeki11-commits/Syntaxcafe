import { uuidToDisplayId, formatOrderNumber, getOrderSource, displayStatus, statusBadgeVariant } from "@/lib/utils";
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Utensils, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderDetailsDialog } from '@/components/common/OrderDetailsDialog';

interface OrdersListProps {
  orders: any[];
  selectedDate: string;
  userRole?: string;
  paidOrderIdSet: Set<string>;
  menuMainCategoryById: { [key: number]: string };
  filterType: string;
  onUpdateStatus: (orderId: number, status: string) => void;
  onCreateNew: () => void;
  usersMap?: { [key: number]: { name: string; role: string } };
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  paidOrderIdSet,
  usersMap
}) => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const getWaiterName = (order: any) => {
    if (!usersMap) return 'N/A';
    const waiterId = order.waiter_id || order.employee_id || order.created_by_id;
    const user = waiterId ? usersMap[waiterId] : null;
    return user ? user.name : 'N/A';
  };

  if (!orders.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-bold">Order ID</TableHead>
            <TableHead className="font-bold">Table</TableHead>
            <TableHead className="font-bold">Waiter</TableHead>
            <TableHead className="font-bold">Placed By</TableHead>
            <TableHead className="font-bold">Date & Time</TableHead>
            <TableHead className="font-bold">Items</TableHead>
            <TableHead className="font-bold">Total</TableHead>
            <TableHead className="font-bold">Payment</TableHead>
            <TableHead className="font-bold text-center">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const isPaid = paidOrderIdSet?.has(String(order.id)) || order.payment_status === 'paid';
            const items = order.items || [];
            const totalItemsCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
            const waiterName = getWaiterName(order);

            return (
              <TableRow
                key={order.id}
                className={`transition-colors ${order.status === 'ready' ? 'bg-green-50/30' :
                  order.status === 'preparing' ? 'bg-blue-50/30' :
                    order.status === 'pending' ? 'bg-amber-50/30' : ''
                  } hover:bg-muted/50`}
                onClick={() => setSelectedOrder(order)}
              >
                <TableCell className="font-medium">{formatOrderNumber(order)}</TableCell>

                <TableCell>
                  {order.table_number ? (
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-50 text-[10px] font-bold">
                      #{order.table_number}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">None selected</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-sm">{waiterName}</TableCell>
                <TableCell>
                  {getOrderSource(order) === 'cashier' ? (
                    <Badge className="bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-50 text-[10px] font-bold">
                      Cashier
                    </Badge>
                  ) : (
                    <Badge className="bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-50 text-[10px] font-bold">
                      Waiter
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    {totalItemsCount}
                  </div>
                </TableCell>
                <TableCell className="font-bold">
                  {parseFloat(order.total_amount).toLocaleString()} <span className="text-xs text-warning font-normal">Birr</span>
                </TableCell>
                <TableCell>
                  {(() => {
                    // Unified vocabulary: deleted (cancelled/voided) → paid
                    // (confirmed) → pending (in process).
                    const state =
                      displayStatus(order.status) === 'deleted'
                        ? 'deleted'
                        : isPaid
                          ? 'paid'
                          : 'pending';
                    return (
                      <Badge variant={statusBadgeVariant(state)} className="text-[10px] font-bold px-2 py-0.5 capitalize">
                        {state}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)} className="h-8 w-8 hover:bg-accent hover:text-accent-foreground">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <OrderDetailsDialog 
        order={selectedOrder} 
        open={!!selectedOrder} 
        onOpenChange={(open) => !open && setSelectedOrder(null)} 
        usersMap={usersMap} 
      />
    </div>
  );
};
