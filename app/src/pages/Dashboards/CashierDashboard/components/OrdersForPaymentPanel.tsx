import React from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { formatOrderNumber } from '@/lib/utils';

interface OrdersForPaymentPanelProps {
  orders: any[];
  loading: boolean;
  expandedPaymentIds: Set<string>;
  loadingOrderIds: Set<string>;
  processingOrderIds: Set<string>;
  isBlockingPaymentUi: boolean;
  businessUnit: string;
  selectedMenuItemId: string;
  tableNumberFilter: string;
  setTableNumberFilter: (val: string) => void;
  formatCurrency: (val: any) => string;
  getOrderSubtotalForUnitAndMenuItem: (order: any, unit: string, itemId: string) => number;
  getOrderUnitBreakdown: (order: any, unit: string | null) => any;
  getItemSubtotalBirr: (item: any) => number;
  toggleRecentPaymentDetails: (payment: any) => void;
  onConfirmPayment: (order: any) => void;
  onCancelOrder: (order: any) => void;
}

export const OrdersForPaymentPanel: React.FC<OrdersForPaymentPanelProps> = ({
  orders,
  loading,
  processingOrderIds,
  isBlockingPaymentUi,
  businessUnit,
  selectedMenuItemId,
  tableNumberFilter,
  setTableNumberFilter,
  formatCurrency,
  getOrderSubtotalForUnitAndMenuItem,
  getOrderUnitBreakdown,
  getItemSubtotalBirr,
  onConfirmPayment,
  onCancelOrder
}) => {
  if (loading) {
    return (
      <Card className="flex flex-col min-h-[400px] lg:min-h-[550px] overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="pt-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full mb-4 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col min-h-[400px] lg:min-h-[550px] overflow-hidden">
      <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between gap-2 sm:flex-1 sm:justify-start">
          <div>
            <CardTitle className="text-sm">Ready for Payment</CardTitle>
            <CardDescription>Finalized wait staff services</CardDescription>
          </div>
          <Badge variant="info" className="text-xs font-bold shrink-0 sm:hidden">
            {orders.length} Orders
          </Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-[1.5] sm:mr-4">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Filter by Table..."
              value={tableNumberFilter}
              onChange={(e) => setTableNumberFilter(e.target.value)}
              className="h-10 text-[10px] pl-8 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        <Badge variant="info" className="hidden sm:inline-flex text-xs font-bold shrink-0">
          {orders.length} Orders
        </Badge>
      </CardHeader>
      <CardContent className="pt-6 overflow-y-auto flex-1 space-y-3">
        {orders.map((order: any) => (
          <div key={order.id} className="border rounded-2xl p-4 bg-muted/20 hover:bg-muted/30 transition-colors space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-extrabold text-md text-foreground">
                  Order {formatOrderNumber(order)}{order.table_number && ` • Table ${order.table_number}`}
                </span>
                <p className="font-extrabold text-md text-foreground">
                  Waiter: {order.waiter_name || order.employee_name}
                </p>
              </div>

              {(() => {
                const unitSubtotal = getOrderSubtotalForUnitAndMenuItem(order, businessUnit, selectedMenuItemId);
                const full = parseFloat(order.total_amount) || 0;
                const showFull = businessUnit !== 'all' && Number.isFinite(full) && Math.abs(full - unitSubtotal) > 0.01;
                return (
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-success">{formatCurrency(unitSubtotal)}</div>
                    {showFull && <div className="text-[9px] text-muted-foreground">of {formatCurrency(full)}</div>}
                  </div>
                );
              })()}
            </div>

            {(() => {
              const unit = businessUnit === 'all' ? null : businessUnit;
              const breakdown = getOrderUnitBreakdown(order, unit);
              const itemsRaw = Array.isArray(breakdown?.items) ? breakdown.items : [];
              const targetMenuItemId = selectedMenuItemId !== 'all' ? selectedMenuItemId : null;
              const items = targetMenuItemId !== null
                ? itemsRaw.filter((it: any) => it?.menu_item_id === targetMenuItemId)
                : itemsRaw;
              if (!Array.isArray(items) || items.length === 0) return null;
              return (
                <div className="bg-background border rounded-xl p-2.5 space-y-1">
                  {items.map((it: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground">
                        <span className="font-extrabold text-foreground mr-1">{(parseInt(it.quantity, 10) || 1)}x</span>
                        {it.menu_item_name || it.name || 'Item'}
                      </span>
                      <span className="font-extrabold text-foreground">{formatCurrency(getItemSubtotalBirr(it))}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] pt-1.5 border-t">
              <span className="text-muted-foreground font-semibold">
                Completed: {new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  className="h-9 text-[11px] bg-success hover:bg-green-700 text-white font-extrabold"
                  disabled={isBlockingPaymentUi || processingOrderIds.has(order.id)}
                  onClick={() => onConfirmPayment(order)}
                >
                  {processingOrderIds.has(order.id) ? 'Processing...' : 'Confirm'}
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9 text-[11px] font-extrabold"
                  disabled={isBlockingPaymentUi || processingOrderIds.has(order.id)}
                  onClick={() => onCancelOrder(order)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            No orders waiting for payment
          </div>
        )}
      </CardContent>
    </Card>
  );
};
