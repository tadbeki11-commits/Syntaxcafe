import React from "react";
import { List, Home, LogOut, Coffee } from "lucide-react";
import BranchBadge from "@/components/waiter/BranchBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WaiterHeaderProps {
  onLogout: () => void;
  onNavigateToHistory: () => void;
  onNavigateToDashboard: () => void;
}

export const WaiterHeader: React.FC<WaiterHeaderProps> = ({
  onLogout,
  onNavigateToHistory,
  onNavigateToDashboard,
}) => {
  return (
    <Card className="rounded-none border-b shadow-sm bg-card/70 backdrop-blur-md py-0">
      <CardContent className="py-3 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-foreground tracking-wide">
              Create Cafe Order
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <BranchBadge />
              <span className="text-[10px] text-muted-foreground font-semibold">
                Checks Portal
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold gap-1 rounded-xl shadow-inner transition-colors duration-200"
            onClick={onNavigateToHistory}
          >
            <List className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Order History</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold gap-1 rounded-xl shadow-inner transition-colors duration-200"
            onClick={onNavigateToDashboard}
          >
            <Home className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs font-bold gap-1 rounded-xl transition-all duration-200 active:scale-95 shadow-md hover:shadow-destructive/15"
            onClick={onLogout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaiterHeader;
