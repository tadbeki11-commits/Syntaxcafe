/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatOrderNumber } from "@/lib/utils";
import React from "react";
import { Calendar, MapPin, Plus, ClipboardList, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import AddItemsModal from "./AddItemsModal";

interface OrderCardProps {
  order: any;
  addingItemsOrderId: string | number | null;
  addingItems: any[];
  menuItems: any[];
  getEffectiveStatus: (order: any) => string;
  getStatusDisplay: (status: string) => any;
  formatDate: (date: any) => string;
  canAddItems: (order: any) => boolean;
  startAddingItems: (order: any) => void;
  cancelAddingItems: () => void;
  addMenuItemToOrder: (item: any) => void;
  updateAddingItemQuantity: (index: number, newQty: number) => void;
  removeAddingItem: (index: number) => void;
  saveAddedItems: () => Promise<void>;
  formatCurrency: (val: any) => string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  addingItemsOrderId,
  addingItems,
  menuItems,
  getEffectiveStatus,
  getStatusDisplay,
  formatDate,
  canAddItems,
  startAddingItems,
  cancelAddingItems,
  addMenuItemToOrder,
  updateAddingItemQuantity,
  removeAddingItem,
  saveAddedItems,
  formatCurrency,
}) => {
  const effectiveStatus = getEffectiveStatus(order);
  const statusDisplay = getStatusDisplay(effectiveStatus);
  const StatusIcon = statusDisplay.icon;
  const isAddingItemsForThisOrder = addingItemsOrderId === order.id;

  const getAmbientStyles = () => {
    switch (effectiveStatus) {
      case "pending":
        return "from-amber-500/5 via-transparent to-transparent border-amber-200/40 hover:border-amber-400/50";
      case "preparing":
        return "from-blue-500/5 via-transparent to-transparent border-info/30 hover:border-blue-400/50";
      case "ready":
      case "paid":
      case "completed":
        return "from-emerald-500/5 via-transparent to-transparent border-emerald-200/40 hover:border-emerald-400/50";
      case "cancelled":
        return "from-red-500/5 via-transparent to-transparent border-destructive/30 hover:border-red-400/50";
      default:
        return "from-gray-500/5 via-transparent to-transparent border-border hover:border-primary/25";
    }
  };

  const getSpotlightColor = () => {
    switch (effectiveStatus) {
      case "pending":
        return "bg-warning/10";
      case "preparing":
        return "bg-info/10";
      case "ready":
      case "paid":
      case "completed":
        return "bg-emerald-500/10";
      case "cancelled":
        return "bg-destructive/10";
      default:
        return "bg-primary/5";
    }
  };

  return (
    <Card
      className={`relative overflow-hidden border bg-gradient-to-br from-card to-card/95 hover:shadow-[0_12px_45px_rgba(0,0,0,0.025)] hover:-translate-y-0.5 transition-all duration-300 rounded-[28px] group ${getAmbientStyles()}`}
    >
      {/* Decorative ambient background spotlight glow */}
      <div
        className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500 pointer-events-none ${getSpotlightColor()}`}
      />

      <CardContent className="p-6 space-y-5">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-start gap-3.5">
            <div className="shrink-0">
              <Badge
                variant={statusDisplay.variant}
                className="rounded-2xl w-11 h-11 p-0 flex items-center justify-center border-none shadow-sm group-hover:scale-110 transition-transform duration-300"
              >
                <StatusIcon className="w-5 h-5 animate-pulse" />
              </Badge>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground tracking-tight">
                  Order {formatOrderNumber(order)}
                </h3>
                <Badge
                  variant="secondary"
                  className="text-[9px] font-black uppercase tracking-wider py-0.5 px-2 bg-muted/80"
                >
                  {order.type || "Cafe"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground/80 font-bold mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {formatDate(order.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {order.order_type_label ||
                    (order.table_number
                      ? `Table #${order.table_number}`
                      : "Take Away")}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing display with pill card */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
            <Badge
              variant={statusDisplay.variant}
              className="text-[9px] uppercase font-black tracking-wider py-0.5 px-2.5 border-none shadow-sm"
            >
              {statusDisplay.label}
            </Badge>
            <div className="text-lg font-black text-primary tracking-tight bg-primary/5 px-3 py-1 rounded-xl">
              {formatCurrency(order.total_amount)}
            </div>
          </div>
        </div>

        {/* Order Items Grid List */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">
                Checkout Items Detailed List
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {order.items.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="text-xs text-foreground bg-muted/20 border border-border/40 hover:border-primary/15 hover:bg-muted/30 transition-all rounded-2xl p-3 flex justify-between items-center shadow-inner group/item"
                >
                  <span className="truncate pr-2 font-bold flex items-center gap-1.5">
                    <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-[10px] shrink-0 group-hover/item:scale-105 transition-transform">
                      {item.quantity}x
                    </span>
                    <span className="truncate">{item.menu_item_name}</span>
                  </span>
                  <span className="font-extrabold text-muted-foreground shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes Block */}
        {order.notes && (
          <div className="border-t border-border/40 pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ChefHat className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">
                Kitchen Instructions Notes
              </h4>
            </div>
            <p className="text-xs text-muted-foreground/90 font-bold leading-relaxed bg-warning/5 p-3 rounded-2xl border border-amber-200/35 shadow-inner">
              &quot;{order.notes}&quot;
            </p>
          </div>
        )}

        {/* Action button to trigger Add Items Modal */}
        {canAddItems(order) && (
          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-black gap-1.5 text-primary border-primary/20 hover:bg-primary/5 rounded-2xl shadow-sm hover:shadow transition-all duration-200 active:scale-95"
              onClick={() => startAddingItems(order)}
            >
              <Plus className="w-3.5 h-3.5 text-primary" /> Add Items
            </Button>
          </div>
        )}

        {/* Modular double-column Dialog/Modal component */}
        {isAddingItemsForThisOrder && (
          <AddItemsModal
            isOpen={isAddingItemsForThisOrder}
            onClose={cancelAddingItems}
            order={order}
            addingItems={addingItems}
            menuItems={menuItems}
            addMenuItemToOrder={addMenuItemToOrder}
            updateAddingItemQuantity={updateAddingItemQuantity}
            removeAddingItem={removeAddingItem}
            saveAddedItems={saveAddedItems}
            formatCurrency={formatCurrency}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default OrderCard;
