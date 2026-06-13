import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, PieChart, TrendingUp } from 'lucide-react';

interface SubReportsQuickActionsProps {
  handleCustomerAnalytics: () => void;
  handleInventoryReports: () => void;
  handlePerformanceMetrics: () => void;
}

export const SubReportsQuickActions: React.FC<SubReportsQuickActionsProps> = ({
  handleCustomerAnalytics,
  handleInventoryReports,
  handlePerformanceMetrics
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="text-center hover:shadow-lg transition-all">
        <CardContent className="pt-6 space-y-3">
          <Users className="w-10 h-10 text-primary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Customer Analytics</h3>
            <p className="text-muted-foreground text-[10px] font-semibold">
              Track customer preferences and average bill size.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-bold" 
            onClick={handleCustomerAnalytics}
          >
            View Details
          </Button>
        </CardContent>
      </Card>

      <Card className="text-center hover:shadow-lg transition-all">
        <CardContent className="pt-6 space-y-3">
          <PieChart className="w-10 h-10 text-success mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Inventory Reports</h3>
            <p className="text-muted-foreground text-[10px] font-semibold">
              Monitor stock levels and ingredient usage ratios.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-bold" 
            onClick={handleInventoryReports}
          >
            View Details
          </Button>
        </CardContent>
      </Card>

      <Card className="text-center hover:shadow-lg transition-all">
        <CardContent className="pt-6 space-y-3">
          <TrendingUp className="w-10 h-10 text-primary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Performance Metrics</h3>
            <p className="text-muted-foreground text-[10px] font-semibold">
              Analyze wait times, waiter speeds, and total throughput.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-bold" 
            onClick={handlePerformanceMetrics}
          >
            View Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubReportsQuickActions;
