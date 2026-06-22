import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Printer, Settings2, TrendingUp } from 'lucide-react';
import BranchBadge from '@/components/common/BranchBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HeaderBannerProps {
  businessUnit: string;
  setBusinessUnit: (unit: string) => void;
  selectedMenuItemId: string;
  setSelectedMenuItemId: (id: string) => void;
  menuItemsForSelectedUnit: any[];
  mainCategories?: Array<{ name: string; slug: string }>;
  qzStatus: any;
  syncStatus: any;
  onManualSync: () => void;
  onTestPrint: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  qzStatus,
  syncStatus,
  onManualSync,
  onTestPrint
}) => {
  const navigate = useNavigate();

  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background shadow-sm">
      <CardContent className="pt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg text-foreground">Cashier Dashboard</h1>

            </div>
            <div className="text-xs text-muted-foreground font-semibold flex items-center gap-2 flex-wrap mt-0.5">
             
              <Badge variant="success" className="h-5 px-1.5 text-[9px] font-bold gap-1 bg-success/10 text-success border-none">
                <Printer className="w-2.5 h-2.5" />
                Auto-Print ON
              </Badge>
              {qzStatus.connected ? (
                <Badge variant="info" className="h-5 px-1.5 text-[9px] font-bold gap-1 bg-info/10 text-info border-none">
                  <span className="w-1.5 h-1.5 bg-info rounded-full animate-pulse"></span>
                  Printer Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold text-warning bg-warning/10 border-none">
                  Printer Offline
                </Badge>
              )}
              {syncStatus.online ? (
                <Badge variant="success" className="h-5 px-1.5 text-[9px] font-bold gap-1 bg-success/10 text-success border-none">
                  <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                  ONLINE
                </Badge>
              ) : (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold text-destructive bg-destructive/10 border-none">
                  <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                  OFFLINE MODE
                </Badge>
              )}
              {syncStatus.unsyncedCount > 0 && (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold text-warning bg-warning/10 border-none animate-pulse">
                  {syncStatus.unsyncedCount} Unsynced
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {syncStatus.online && (
              <Button
                variant={syncStatus.online ? 'default' : 'outline'}
                size="sm"
                className={`h-10 flex-1 lg:flex-none text-xs font-bold gap-1 transition-all ${syncStatus.online ? 'bg-warning hover:bg-warning/90 text-warning-foreground border-warning' : 'opacity-50 cursor-not-allowed'}`}
                onClick={onManualSync}
                disabled={syncStatus.syncing || !syncStatus.online}
              >
                {syncStatus.syncing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Sync Now {syncStatus.unsyncedCount > 0 ? `(${syncStatus.unsyncedCount})` : ''}</span>
                  </>
                )}
              </Button>
            )}

            <Button variant="outline" size="sm" className="h-10 flex-1 lg:flex-none text-xs font-bold" onClick={() => navigate('/dashboard/cashier/employees')}>
              <User className="w-3.5 h-3.5 mr-1" /> Waiters
            </Button>

            <Button variant="outline" size="sm" className="h-10 flex-1 lg:flex-none text-xs font-bold" onClick={onTestPrint}>
              <Printer className="w-3.5 h-3.5 mr-1" /> Test Print
            </Button>

            <Button variant="outline" size="sm" className="h-10 flex-1 lg:flex-none text-xs font-bold" onClick={() => navigate('/dashboard/cashier/printer-settings')}>
              <Settings2 className="w-3.5 h-3.5 mr-1" /> Printer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
