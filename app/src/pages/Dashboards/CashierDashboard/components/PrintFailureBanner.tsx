import React from 'react';
import { AlertTriangle, Printer, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StuckPrintOrder } from '../hooks/useCashierPrinting';

interface PrintFailureBannerProps {
  stuckOrders: StuckPrintOrder[];
  onRetry: (orderId: number) => void;
}

/**
 * Persistent banner shown when one or more orders have failed to print
 * repeatedly. The background poll keeps retrying these automatically; this
 * just makes a stuck printer visible so the cashier can fix it (paper, power,
 * connection) or trigger an immediate retry.
 */
export const PrintFailureBanner: React.FC<PrintFailureBannerProps> = ({
  stuckOrders,
  onRetry,
}) => {
  if (!stuckOrders || stuckOrders.length === 0) return null;

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-destructive">
              {stuckOrders.length} order{stuckOrders.length > 1 ? 's' : ''} failed to print
            </h3>
            <span className="text-[11px] text-destructive/80">
              Auto-retrying in the background — check the printer (paper, power, connection).
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {stuckOrders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Printer className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    Order #{o.id}
                    {o.table_number ? ` · Table ${o.table_number}` : ''}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {o.attempts} attempts
                  </span>
                  {o.error ? (
                    <span className="text-[10px] text-destructive/70 truncate hidden sm:inline">
                      — {o.error}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-bold gap-1 shrink-0"
                  onClick={() => onRetry(o.id)}
                >
                  <RotateCw className="w-3 h-3" />
                  Retry now
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
