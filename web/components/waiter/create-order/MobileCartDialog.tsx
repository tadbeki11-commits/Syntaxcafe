/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { WaiterCartSidebar } from "./WaiterCartSidebar";

interface MobileCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}

export const MobileCartDialog: React.FC<MobileCartDialogProps> = ({
  open,
  onOpenChange,
  orderItems,
  selectedTable,
  creatingOrder,
  onUpdateQuantity,
  onRemoveFromOrder,
  onSubmitOrder,
  calculateTotal,
  getOrderRoutingInfo,
  formatCurrency,
  forceTableSelection = false,
}) => {
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Floating Action Button for Mobile Screens */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => onOpenChange(true)}
          className="h-14 rounded-full px-5 shadow-2xl flex items-center gap-2.5 bg-primary hover:bg-primary/95 text-primary-foreground border border-primary/20 transition-all duration-200 active:scale-95"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {orderItems.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-3.5 -right-3 h-5 w-5 rounded-full flex items-center justify-center p-0 text-[10px] font-extrabold border-2 border-background shadow-sm animate-pulse"
              >
                {totalQuantity}
              </Badge>
            )}
          </div>
          <div className="text-left leading-none">
            <p className="text-[9px] uppercase font-bold tracking-wider opacity-85">
              View Order
            </p>
            <p className="text-xs font-black mt-0.5">
              {formatCurrency(calculateTotal())}
            </p>
          </div>
        </Button>
      </div>

      {/* Mobile Cart Overlay Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTitle></DialogTitle>
        <DialogContent className="max-w-md w-[92%] p-0 overflow-hidden rounded-2xl border bg-card shadow-2xl max-h-[90vh] flex flex-col">
          <WaiterCartSidebar
            isMobile
            orderItems={orderItems}
            selectedTable={selectedTable}
            creatingOrder={creatingOrder}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveFromOrder={onRemoveFromOrder}
            onSubmitOrder={onSubmitOrder}
            calculateTotal={calculateTotal}
            getOrderRoutingInfo={getOrderRoutingInfo}
            formatCurrency={formatCurrency}
            forceTableSelection={forceTableSelection}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileCartDialog;
