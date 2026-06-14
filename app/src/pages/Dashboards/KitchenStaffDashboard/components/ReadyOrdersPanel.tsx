import { uuidToDisplayId, formatOrderNumber } from "@/lib/utils";
import React from 'react';
import { MapPin, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ReadyOrdersPanelProps {
  orders: any[];
  loading: boolean;
  formatCurrency: (val: any) => string;
}

export const ReadyOrdersPanel: React.FC<ReadyOrdersPanelProps> = ({
  orders,
  loading,
  formatCurrency
}) => {
  if (loading) {
    return (
      <Card className="flex flex-col h-[650px] overflow-hidden border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="pt-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full mb-4 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[650px] overflow-hidden border shadow-sm">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-muted/20">
        <div>
          <CardTitle className="text-xs uppercase font-extrabold tracking-wide">Pickup Window</CardTitle>
          <CardDescription className="text-[10px] font-semibold mt-0.5">Dispatched to server tray</CardDescription>
        </div>
        <Badge variant="success" className="text-[10px] font-bold py-0.5 px-2 border-none">
          {orders.length} Ready
        </Badge>
      </CardHeader>
      <CardContent className="pt-4 overflow-y-auto flex-1 space-y-3">
        {orders.map((order: any) => (
          <div key={order.id} className="border bg-success/5 border-success/30/50 dark:border-green-900/50 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-success" />
                <span className="font-extrabold text-xs">{order.order_type_label || (order.table_number ? `Table ${order.table_number}` : 'Take Away')}</span>
                <span className="text-[9px] text-muted-foreground font-semibold">{formatOrderNumber(order)}</span>
              </div>
              <span className="text-xs font-extrabold text-success">
                {formatCurrency(order.total_amount)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-[9px]">
              <span className="text-muted-foreground font-semibold">
                Finished: {new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <Badge variant="success" className="text-[8px] uppercase py-0.5 px-2 border-none flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" /> Servable
              </Badge>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="p-10 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            Tray is empty, nothing servable
          </div>
        )}
      </CardContent>
    </Card>
  );
};
