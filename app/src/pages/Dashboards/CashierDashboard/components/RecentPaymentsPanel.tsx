import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { displayStatus, statusBadgeVariant, uuidToDisplayId } from '@/lib/utils';

interface RecentPaymentsPanelProps {
  payments: any[];
  loading: boolean;
  expandedPaymentIds: Set<string>;
  loadingOrderIds: Set<string>;
  orderDetailsById: any;
  businessUnit: string;
  selectedMenuItemId: string;
  formatCurrency: (val: any) => string;
  getOrderUnitBreakdown: (order: any, unit: string | null) => any;
  getItemSubtotalBirr: (item: any) => number;
  getPaymentAmountForSelection: (payment: any, unit: string, itemId: string) => number;
  toggleRecentPaymentDetails: (payment: any) => void;
  orderIndex?: any;
}

export const RecentPaymentsPanel: React.FC<RecentPaymentsPanelProps> = ({
  payments,
  loading,
  expandedPaymentIds,
  loadingOrderIds,
  orderDetailsById,
  businessUnit,
  selectedMenuItemId,
  formatCurrency,
  getOrderUnitBreakdown,
  getItemSubtotalBirr,
  getPaymentAmountForSelection,
  toggleRecentPaymentDetails
  , orderIndex
}) => {
  const resolvePaymentOrderId = (payment: any) => {
    const directOrderId = payment?.order_id != null ? payment.order_id : null;
    if (directOrderId != null && directOrderId !== "") return directOrderId;

    const nestedOrderId = payment?.order?.id != null ? payment.order.id : null;
    if (nestedOrderId != null && nestedOrderId !== "") return nestedOrderId;

    const metaOrderId = payment?.meta?.orderId != null ? payment.meta.orderId : null;
    if (metaOrderId != null && metaOrderId !== "") return metaOrderId;

    const metaOrderIdAlt = payment?.meta?.order_id != null ? payment.meta.order_id : null;
    if (metaOrderIdAlt != null && metaOrderIdAlt !== "") return metaOrderIdAlt;

    return null;
  };

  const getOrderFromIndex = (orderId: number | null) => {
    if (orderId == null) return null;
    const idx: any = orderIndex || {};
    if (idx.byId && idx.byId[orderId]) return idx.byId[orderId];
    if (idx.byRemoteId && idx.byRemoteId[orderId]) return idx.byRemoteId[orderId];
    if (idx.byLocalId && idx.byLocalId[String(orderId)]) return idx.byLocalId[String(orderId)];
    // fallback to direct map
    if (orderDetailsById && orderDetailsById[orderId]) return orderDetailsById[orderId];
    return null;
  };

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
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm">Recent Ledger Entries</CardTitle>
        <CardDescription>Processed payments from active drawer sessions</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 overflow-y-auto flex-1 space-y-3">
        {payments.map((payment: any) => (
          <div key={payment.id} className="border rounded-2xl p-4 bg-muted/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={statusBadgeVariant(payment.status)}
                  className="text-[8px] uppercase py-0 px-1.5"
                >
                  {displayStatus(payment.status)}
                </Badge>
                {(() => {
                  // Local payments don't carry order_number (offline-first), so
                  // resolve it from the linked order; fall back to a short id.
                  const orderId = resolvePaymentOrderId(payment);
                  const order = orderId != null ? getOrderFromIndex(orderId) : null;
                  const num = payment.order_number ?? order?.order_number;
                  if (num == null && orderId == null) return null;
                  const label =
                    num != null ? `#${num}` : `#${uuidToDisplayId(String(orderId))}`;
                  return (
                    <button
                      type="button"
                      onClick={() => toggleRecentPaymentDetails(payment)}
                      className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold text-primary hover:bg-primary/20"
                    >
                      {label}
                    </button>
                  );
                })()}
              </div>

              {(() => {
                const unitAmount = getPaymentAmountForSelection(payment, businessUnit, selectedMenuItemId);
                const orderId = resolvePaymentOrderId(payment);
                const needsDetails = !(businessUnit === 'all' && selectedMenuItemId === 'all');
                const hasDetails = !needsDetails || (orderId == null ? false : !!getOrderFromIndex(orderId));
                return (
                  <span className="text-xs font-extrabold text-foreground">
                    {(needsDetails && !hasDetails) ? '...' : formatCurrency(unitAmount)}
                  </span>
                );
              })()}
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
              <span className="uppercase tracking-wide">Method</span>
              <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 h-5">
                {payment.payment_method?.replace('_', ' ') || 'unknown'}
              </Badge>
              <span>{new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="pt-1.5 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 p-0 text-[10px] font-extrabold text-primary hover:bg-transparent"
                onClick={() => toggleRecentPaymentDetails(payment)}
              >
                {expandedPaymentIds.has(payment.id) ? (
                  <>Hide details <ChevronUp className="w-3 h-3 ml-1" /></>
                ) : (
                  <>Show details <ChevronDown className="w-3 h-3 ml-1" /></>
                )}
              </Button>
            </div>

            {expandedPaymentIds.has(payment.id) && (
              <div className="bg-background border rounded-xl p-2.5 space-y-2 mt-2">
                {(() => {
                  const orderId = resolvePaymentOrderId(payment);
                  if (orderId == null) return <div className="text-[10px] text-muted-foreground font-bold">No order details</div>;
                  if (loadingOrderIds.has(String(orderId))) return <Skeleton className="h-10 w-full rounded-lg" />;

                  const order = getOrderFromIndex(orderId) || null;
                  if (!order) return <div className="text-[10px] text-muted-foreground font-bold">Details unavailable</div>;

                  const unit = businessUnit === 'all' ? null : businessUnit;
                  const breakdown = getOrderUnitBreakdown(order, unit);
                  const itemsRaw = Array.isArray(breakdown.items) ? breakdown.items : [];
                  const targetMenuItemId = selectedMenuItemId !== 'all' ? selectedMenuItemId : null;
                  const items = targetMenuItemId !== null
                    ? itemsRaw.filter((it: any) => it?.menu_item_id === targetMenuItemId)
                    : itemsRaw;

                  return (
                    <div className="space-y-1.5 text-[11px]">
                      {(order.employee_name || order.waiter_name) && (
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          Waiter: <span className="font-extrabold text-foreground">{order.employee_name || order.waiter_name}</span>
                        </div>
                      )}
                      {items.length > 0 && (
                        <div className="space-y-1">
                          {items.map((it: any) => (
                            <div
                              key={it.id || `${it.menu_item_id}-${it.quantity}`}
                              className="flex items-center justify-between gap-2 border-b border-muted last:border-b-0 pb-1 last:pb-0"
                            >
                              <span className="text-muted-foreground truncate">
                                <span className="font-extrabold text-foreground mr-1">{(parseInt(it.quantity, 10) || 0)}x</span>
                                {it.menu_item_name || it.name || 'Item'}
                              </span>
                              <span className="font-extrabold text-foreground">{formatCurrency(getItemSubtotalBirr(it))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
        {payments.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            No recent payments
          </div>
        )}
      </CardContent>
    </Card>
  );
};
