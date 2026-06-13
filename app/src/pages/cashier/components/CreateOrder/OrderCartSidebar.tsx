import React from 'react';
import { FiShoppingCart, FiMinus, FiPlus, FiX, FiCheck } from 'react-icons/fi';

interface OrderCartSidebarProps {
  orderItems: any[];
  waiterName: string;
  creatingOrder: boolean;
  onUpdateQuantity: (menuItemId: any, change: number) => void;
  onRemoveFromOrder: (menuItemId: any) => void;
  onSubmitOrder: () => void;
  calculateTotal: () => string;
}

const OrderCartSidebar: React.FC<OrderCartSidebarProps> = ({
  orderItems,
  waiterName,
  creatingOrder,
  onUpdateQuantity,
  onRemoveFromOrder,
  onSubmitOrder,
  calculateTotal
}) => {
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="lg:w-96 flex-shrink-0">
      <div className="lg:sticky lg:top-24">
        <div className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-border/50 border border-border/50 overflow-hidden flex flex-col h-[calc(100vh-8rem)] min-h-[500px] max-h-[800px]">
          {/* Header */}
          <div className="p-6 bg-primary text-primary-foreground shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-background/20 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight">Current Order</h3>
                <div className="text-sm font-medium mt-1 text-primary-foreground/70">
                  Waiter: {waiterName}
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/20 shadow-inner">
                <FiShoppingCart className="w-5 h-5 text-primary-foreground" />
                <span className="text-sm font-bold text-primary-foreground">
                  {totalItemsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {orderItems.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4 border border-border/50 shadow-sm">
                  <FiShoppingCart className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">Your cart is empty</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Select items from the menu to add</p>
              </div>
            ) : (
              orderItems.map((item) => (
                <div
                  key={item.menu_item_id}
                  className="group flex items-center gap-3 p-3 bg-background border border-border/50 rounded-2xl hover:shadow-md hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="font-bold text-foreground/90 text-sm truncate leading-tight">
                      {item.menu_item_name}
                    </h4>
                    <p className="text-xs font-semibold text-warning mt-0.5">
                      {parseFloat(item.price).toFixed(2)} Birr
                    </p>
                  </div>

                  <div className="flex items-center bg-muted/30 rounded-xl p-1 border border-border/50">
                    <button
                      onClick={() => onUpdateQuantity(item.menu_item_id, -1)}
                      className="w-7 h-7 rounded-lg bg-background text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center shadow-sm border border-border/50"
                    >
                      <FiMinus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-foreground text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.menu_item_id, 1)}
                      className="w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center shadow-sm border border-primary/20"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveFromOrder(item.menu_item_id)}
                    className="w-8 h-8 rounded-full bg-muted/30 text-muted-foreground/40 hover:bg-destructive/15 hover:text-destructive transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer / Place Order */}
          <div className="p-6 bg-muted/30/80 backdrop-blur-md border-t border-border/50">
            {orderItems.length > 0 && (
              <div className="flex justify-between items-end mb-5">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Amount</span>
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {calculateTotal()} <span className="text-lg text-warning">Birr</span>
                </span>
              </div>
            )}

            <button
              onClick={onSubmitOrder}
              disabled={orderItems.length === 0 || creatingOrder}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg ${
                orderItems.length === 0 || creatingOrder
                  ? 'bg-muted text-muted-foreground/60 cursor-not-allowed shadow-none'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {creatingOrder ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-6 h-6" />
                  <span>Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCartSidebar;
