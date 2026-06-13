import React from 'react';
import { Clipboard, Plus, LogOut } from 'lucide-react';
import BranchBadge from '@/components/common/BranchBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OrderHistoryHeaderProps {
  totalOrdersCount: number;
  onNewOrder: () => void;
  onLogout: () => void;
}

export const OrderHistoryHeader: React.FC<OrderHistoryHeaderProps> = ({
  totalOrdersCount,
  onNewOrder,
  onLogout
}) => {
  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background shadow-sm rounded-3xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-3 rounded-2xl text-primary shadow-sm shrink-0">
            <Clipboard className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-wide">
                Waiter Order History
              </h1>
              <BranchBadge />
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Manage and track all checkouts logged under your profile ({totalOrdersCount} total orders)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-bold gap-1 rounded-xl shadow-inner hover:bg-primary/5 transition-colors"
            onClick={onNewOrder}
          >
            <Plus className="w-3.5 h-3.5 text-primary" /> New Order
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-9 text-xs font-bold gap-1 rounded-xl shadow transition-all duration-200 active:scale-95 hover:shadow-destructive/15"
            onClick={onLogout}
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderHistoryHeader;
