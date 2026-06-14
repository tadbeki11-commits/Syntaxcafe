/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  MapPin,
  Clock,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WaiterCartSidebarProps {
  orderItems: any[];
  selectedTable: string;
  creatingOrder: boolean;
  onUpdateQuantity: (id: any, change: number) => void;
  onRemoveFromOrder: (id: any) => void;
  onSubmitOrder: () => Promise<void>;
  calculateTotal: () => string;
  getOrderRoutingInfo: () => any;
  formatCurrency: (val: any) => string;
  forceTableSelection?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export const WaiterCartSidebar: React.FC<WaiterCartSidebarProps> = ({
  orderItems,
  selectedTable,
  creatingOrder,
  onUpdateQuantity,
  onRemoveFromOrder,
  onSubmitOrder,
  calculateTotal,
  formatCurrency,
  forceTableSelection = false,
}) => {
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const isRealTableSelected =
    !!selectedTable && selectedTable !== "takeaway" && selectedTable !== "beu";
  const tableRequirementUnmet = forceTableSelection && !isRealTableSelected;

  return (
    <div className="flex flex-col overflow-hidden bg-card h-full min-h-0">
      {/* Sleek Gradient Header */}
      <div className="shrink-0 border-b border-border/60 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.22em] text-warning">
              Order Summary
            </p>
            <h3 className="mt-1 font-extrabold tracking-tight text-foreground">
              Current table order
            </h3>

            <div className="mt-3">
              {selectedTable ? (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-700 border-none font-bold py-0.5 px-2 rounded-lg text-[9px] flex items-center gap-1 shrink-0 shadow-sm"
                >
                  <MapPin className="w-3 h-3 text-emerald-500 animate-bounce" />
                  {selectedTable === "takeaway"
                    ? "Take Away"
                    : selectedTable === "beu"
                      ? "Beu"
                      : `Table #${selectedTable}`}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-warning/10 text-amber-700 border-none font-bold py-0.5 px-2 rounded-lg text-[9px] flex items-center gap-1 shrink-0 shadow-sm"
                >
                  <Clock className="w-3 h-3 text-warning animate-pulse" />
                  No Table Selected
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-2xl border border-border/70 bg-background/80 px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-foreground">
                {totalItems} items
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-4">
        {orderItems.length === 0 ? (
          <div className="text-center space-y-3 rounded-[28px] border border-dashed border-border/80 bg-gradient-to-b from-muted/10 to-background p-5 py-16 animate-in fade-in duration-300">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border bg-background shadow-inner">
              <ShoppingCart className="w-6 h-6 text-muted-foreground/45 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-foreground">
                Your cart is empty
              </p>
              <p className="mx-auto mt-1 max-w-[220px] text-[10px] font-semibold leading-relaxed text-muted-foreground/75">
                Add items from the menu to build the table order and submit it
                when ready.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1 animate-in slide-in-from-bottom-2 duration-300">
            {orderItems.map((item) => (
              <div
                key={item.menu_item_id}
                className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/15 p-2.5 transition-all duration-200 hover:border-primary/15 hover:bg-muted/25"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="truncate text-foreground">
                    {item.menu_item_name}
                  </h4>
                  <p className="mt-0.5 font-bold text-muted-foreground/80">
                    {formatCurrency(item.price)}
                  </p>
                </div>

                {/* Counter controls */}
                <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-background p-1 shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => onUpdateQuantity(item.menu_item_id, -1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-4 text-center text-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => onUpdateQuantity(item.menu_item_id, 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => onRemoveFromOrder(item.menu_item_id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total + Submit — pinned to bottom */}
      <div className="shrink-0 px-5 pb-5">
        {orderItems.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/10 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.02] to-transparent p-4 shadow-inner">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
              Total Amount
            </span>
            <span className="text-base font-black tracking-tight text-emerald-600">
              {formatCurrency(calculateTotal())}
            </span>
          </div>
        )}

        {tableRequirementUnmet && orderItems.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            A table number is required — Take Away and Beu are not allowed.
          </p>
        )}

        <Button
          disabled={
            orderItems.length === 0 || creatingOrder || tableRequirementUnmet
          }
          className="mt-4 h-12 w-full gap-1.5 rounded-2xl bg-primary text-xs font-black text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
          onClick={onSubmitOrder}
        >
          {creatingOrder ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating checkout order...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-primary-foreground" /> Place Order
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default WaiterCartSidebar;
