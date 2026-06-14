import { uuidToDisplayId, formatOrderNumber } from "@/lib/utils";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ActiveInvoicesTableProps {
  ordersForPaymentSorted: any[];
  tableFilter: string;
  setTableFilter: (val: string) => void;
  getOrderItemsForRow: (order: any) => any[];
  loadingOrderIds: Set<string>;
  processingOrders: Set<string>;
  openProcessPaymentConfirm: (order: any) => void;
  openCancelConfirm: (order: any) => void;
  formatCurrency: (val: any) => string;
}

export const ActiveInvoicesTable: React.FC<ActiveInvoicesTableProps> = ({
  ordersForPaymentSorted,
  tableFilter,
  setTableFilter,
  getOrderItemsForRow,
  loadingOrderIds,
  processingOrders,
  openProcessPaymentConfirm,
  openCancelConfirm,
  formatCurrency
}) => {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-foreground">
            Active Table Invoices
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs">
            Collect and complete cash transactions
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-44">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Table filter..."
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Badge variant="secondary" className="shrink-0">
            {ordersForPaymentSorted.length} Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-10 text-xs font-medium uppercase text-muted-foreground">
                Order #
              </TableHead>
              <TableHead className="h-10 text-xs font-medium uppercase text-muted-foreground">
                Table
              </TableHead>
              <TableHead className="h-10 text-xs font-medium uppercase text-muted-foreground">
                Items
              </TableHead>
              <TableHead className="h-10 text-xs font-medium uppercase text-muted-foreground">
                Subtotal
              </TableHead>
              <TableHead className="h-10 text-right text-xs font-medium uppercase text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersForPaymentSorted.length > 0 ? (
              ordersForPaymentSorted.map((o) => {
                const isProcessing = processingOrders.has(o.id);
                return (
                  <TableRow key={o.id} className="border-b">
                    <TableCell className="py-3.5 text-xs font-semibold text-foreground">
                      {formatOrderNumber(o)}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground">
                      {o.order_type_label || (o.table_number ? `Table ${o.table_number}` : 'Take Away')}
                    </TableCell>
                    <TableCell className="min-w-[200px] py-3.5">
                      {(() => {
                        const items = getOrderItemsForRow(o);
                        if (items.length > 0) {
                          return (
                            <div className="space-y-1 rounded-lg border bg-muted/40 p-2.5 text-[11px]">
                              {items.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-muted-foreground"
                                >
                                  <span>
                                    {item.quantity}x {item.menu_item_name || item.name || 'Item'}
                                  </span>
                                  <span className="ml-3 font-medium text-foreground">
                                    {formatCurrency(item.subtotal || item.total_price || 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        const id = o?.id != null ? o.id : null;
                        const isLoading =
                          id !== null && (id !== null && id !== undefined && id !== "")
                            ? loadingOrderIds.has(id)
                            : false;
                        return (
                          <span className="flex items-center gap-1.5 py-1 text-[11px] text-muted-foreground">
                            {isLoading ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                Loading items...
                              </>
                            ) : (
                              'No items loaded'
                            )}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs font-semibold text-success">
                      {formatCurrency(o.total_amount)}
                    </TableCell>
                    <TableCell className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => openProcessPaymentConfirm(o)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Settling...
                            </span>
                          ) : (
                            'Settle Cash'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => openCancelConfirm(o)}
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-14 text-center text-xs text-muted-foreground"
                >
                  No active table invoices waiting for payment
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
