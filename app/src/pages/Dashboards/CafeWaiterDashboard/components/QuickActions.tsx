import React from 'react';
import { ShoppingCart, List, Coffee, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onNewOrder: () => void;
  onOrderHistory: () => void;
  onViewMenu: () => void;
  onMyProfile: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNewOrder,
  onOrderHistory,
  onViewMenu,
  onMyProfile
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Quick Shortcuts</CardTitle>
        <CardDescription>Direct waitering action pathways</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          onClick={onNewOrder}
          className="h-24 flex flex-col items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-md"
        >
          <ShoppingCart className="w-7 h-7" />
          <span className="font-extrabold text-xs">Create Order</span>
        </Button>

        <Button
          onClick={onOrderHistory}
          className="h-24 flex flex-col items-center justify-center gap-2 bg-success hover:bg-success/90 text-success-foreground border-0 shadow-md"
        >
          <List className="w-7 h-7" />
          <span className="font-extrabold text-xs">Order History</span>
        </Button>

        <Button
          onClick={onViewMenu}
          className="h-24 flex flex-col items-center justify-center gap-2 bg-info hover:bg-info/90 text-info-foreground border-0 shadow-md"
        >
          <Coffee className="w-7 h-7" />
          <span className="font-extrabold text-xs">View Menu</span>
        </Button>

        <Button
          onClick={onMyProfile}
          className="h-24 flex flex-col items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground border-0 shadow-md"
        >
          <User className="w-7 h-7" />
          <span className="font-extrabold text-xs">My Profile</span>
        </Button>
      </CardContent>
    </Card>
  );
};
