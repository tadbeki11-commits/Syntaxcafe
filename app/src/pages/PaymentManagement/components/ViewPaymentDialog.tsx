import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ViewPaymentDialogProps {
  viewOpen: boolean;
  setViewOpen: (open: boolean) => void;
  viewLoading: boolean;
  viewPayment: any;
  viewOrder: any;
}

export const ViewPaymentDialog: React.FC<ViewPaymentDialogProps> = ({
  viewOpen,
  setViewOpen,
  viewLoading,
  viewPayment,
  viewOrder
}) => {
  return (
    <Dialog open={viewOpen} onOpenChange={setViewOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>
        {viewLoading ? (
          <div className="space-y-3 py-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    {(viewOrder?.waiter_name || viewOrder?.employee_name) && (
                      <p className="text-sm text-muted-foreground">
                        Waiter: <span className="font-medium text-foreground">{viewOrder.waiter_name || viewOrder.employee_name}</span>
                      </p>
                    )}
                    {viewPayment?.payment_method && (
                      <Badge variant="info" className="mt-1 text-[10px]">
                        {viewPayment.payment_method.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {(parseFloat(String(viewPayment?.amount)) || 0).toLocaleString()} Birr
                    </p>
                    {viewPayment?.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(viewPayment.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {Array.isArray(viewOrder?.items) && viewOrder.items.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2">
                  {viewOrder.items.map((it: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="font-bold text-primary">{parseInt(String(it.quantity), 10) || 1}x</span>{' '}
                        {it.menu_item_name || it.name}
                      </span>
                      <span className="font-medium">
                        {(parseFloat(String(it.subtotal)) || 0).toLocaleString()} Birr
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                No order items available
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewPaymentDialog;
