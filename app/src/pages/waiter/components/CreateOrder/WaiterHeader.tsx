import React from 'react';
import { List, Home, LogOut, RefreshCw } from 'lucide-react';
import BranchBadge from '@/components/common/BranchBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WaiterHeaderProps {
  onLogout: () => void;
  onNavigateToHistory: () => void;
  onNavigateToDashboard: () => void;
  syncStatus?: any;
  onManualSync?: () => void;
}

export const WaiterHeader: React.FC<WaiterHeaderProps> = ({
  onLogout,
  onNavigateToHistory,
  onNavigateToDashboard,
  syncStatus,
  onManualSync
}) => {
  return (
    <Card className="rounded-none border-b shadow-sm bg-card/70 backdrop-blur-md">
      <CardContent className="py-3 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/assets/logo.png?v=8"
            alt="Logo"
            className="w-9 h-9 object-contain bg-background rounded-lg p-0.5 shadow-sm"
          />
          <div>
            <h1 className="text-sm font-extrabold text-foreground tracking-wide">Create Cafe Order</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <BranchBadge />
              <span className="text-[10px] text-muted-foreground font-semibold">Checks Portal</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onManualSync && syncStatus?.online && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-bold gap-1 rounded-xl shadow-inner border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              onClick={onManualSync}
              disabled={syncStatus.syncing}
            >
              <RefreshCw className={cn("w-3 h-3", syncStatus.syncing && "animate-spin")} />
              <span className="hidden sm:inline">{syncStatus.syncing ? 'Syncing...' : 'Sync Menu'}</span>
            </Button>
          )}
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
            <span className="hidden xs:inline sm:inline">Log Out</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaiterHeader;
