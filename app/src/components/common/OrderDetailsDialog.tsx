import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uuidToDisplayId } from '@/lib/utils';

export interface OrderDetailsDialogProps {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usersMap?: { [key: number | string]: { name: string; role: string } };
}

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  open,
  onOpenChange,
  usersMap,
}) => {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Order Details #{uuidToDisplayId(order.id)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-md">
            <div>
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">Waiter</span>
              <span className="font-medium">
                {usersMap && (order.waiter_id || order.employee_id)
                  ? (usersMap[order.waiter_id || order.employee_id]?.name || 'N/A')
                  : order.employee_name || 'N/A'}
              </span>
            </div>
            {order.created_by_id && order.created_by_id !== (order.waiter_id || order.employee_id) && (
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Cashier / Created By</span>
                <span className="font-medium">{usersMap?.[order.created_by_id]?.name || 'Unknown'}</span>
              </div>
            )}
            {order.table_number && (
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Table</span>
                <span className="font-medium">#{order.table_number}</span>
              </div>
            )}
            <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Type</span>
                <span className="font-medium capitalize">{order.type}</span>
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="space-y-3">
              {order?.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{item.name || item.menu_item_name || 'Item'}</p>
                    <p className="text-muted-foreground">{item.quantity} x {parseFloat(item.unit_price || item.price || 0).toLocaleString()} Birr</p>
                  </div>
                  <p className="font-medium">
                    {(item.quantity * parseFloat(item.unit_price || item.price || 0)).toLocaleString()} Birr
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center font-bold">
              <span>Total Amount</span>
              <span className="text-primary">{parseFloat(order.total_amount || 0).toLocaleString()} Birr</span>
            </div>
          </div>
          {order?.notes && (
            <div className="text-sm">
              <span className="font-semibold">Notes:</span>
              <p className="text-muted-foreground mt-1 bg-muted p-2 rounded-md">{order.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
