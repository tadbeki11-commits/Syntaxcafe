import React from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  MapPin,
  Clock,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonSpinner } from '@/components/common/LoadingSpinner';

interface WaiterCartSidebarProps {
  orderItems: any[];
  selectedTable: string;
  creatingOrder: boolean;
  onUpdateQuantity: (id: any, change: number) => void;
  onRemoveFromOrder: (id: any) => void;
  onUpdateItemNote?: (id: any, note: string) => void;
  onSubmitOrder: () => Promise<void>;
  calculateTotal: () => string;
  getOrderRoutingInfo: () => any;
  formatCurrency: (val: any) => string;
  forceTableSelection?: boolean;
  notes?: string;
  onNotesChange?: (value: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export const WaiterCartSidebar: React.FC<WaiterCartSidebarProps> = ({
  orderItems,
  selectedTable,
  creatingOrder,
  onUpdateQuantity,
  onRemoveFromOrder,
  onUpdateItemNote,
  onSubmitOrder,
  calculateTotal,
  formatCurrency,
  forceTableSelection = false,
  notes = '',
  onNotesChange,
}) => {
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const isRealTableSelected =
    !!selectedTable && selectedTable !== 'takeaway' && selectedTable !== 'beu';
  const tableRequirementUnmet = forceTableSelection && !isRealTableSelected;

  const tableLabel =
    selectedTable === 'takeaway'
      ? 'Take Away'
      : selectedTable === 'beu'
      ? 'Beu'
      : selectedTable
      ? `Table #${selectedTable}`
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      {/* Header */}
      <div className="shrink-0 border-b border-border/60 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                Order Summary
              </h3>
              <p className="text-[11px] font-medium text-muted-foreground">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
              </p>
            </div>
          </div>

          {tableLabel ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
              <MapPin className="h-3 w-3" />
              {tableLabel}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
              <Clock className="h-3 w-3" />
              No table
            </span>
          )}
        </div>
      </div>

      {/* Cart Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {orderItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center animate-in fade-in duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <ShoppingCart className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Your cart is empty</p>
              <p className="mx-auto max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                Add items from the menu to build the order, then place it when ready.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {orderItems.map((item) => (
              <li
                key={item.menu_item_id}
                className="group rounded-2xl border border-border/60 bg-background p-3 shadow-sm transition-colors hover:border-border"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-foreground">
                      {item.menu_item_name}
                    </h4>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {formatCurrency(item.price)}
                      <span className="text-muted-foreground/50"> × {item.quantity}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onRemoveFromOrder(item.menu_item_id)}
                      aria-label="Remove item"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {formatCurrency(Number(item.price) * Number(item.quantity))}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  {/* Quantity stepper */}
                  <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-l-lg rounded-r-none text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => onUpdateQuantity(item.menu_item_id, -1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-r-lg rounded-l-none text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => onUpdateQuantity(item.menu_item_id, 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {onUpdateItemNote && (
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => onUpdateItemNote(item.menu_item_id, e.target.value)}
                    maxLength={200}
                    placeholder="Item note (e.g. no ice, well done)…"
                    className="mt-2.5 w-full rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-ring focus:bg-background"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: notes + total + submit */}
      {orderItems.length > 0 && (
        <div className="shrink-0 space-y-3 border-t border-border/60 bg-muted/20 px-5 py-4">
          {onNotesChange && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                Order note{' '}
                <span className="font-normal text-muted-foreground/70">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="e.g. no sugar, extra hot, allergy info…"
                className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums">
              {formatCurrency(calculateTotal())}
            </span>
          </div>

          {tableRequirementUnmet && (
            <p className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-[11px] font-medium text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              A table number is required — Take Away and Beu are not allowed.
            </p>
          )}

          <Button
            disabled={creatingOrder || tableRequirementUnmet}
            className="h-12 w-full gap-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98] disabled:shadow-none"
            onClick={onSubmitOrder}
          >
            {creatingOrder ? (
              <>
                <ButtonSpinner />
                Placing order…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Place Order
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WaiterCartSidebar;
