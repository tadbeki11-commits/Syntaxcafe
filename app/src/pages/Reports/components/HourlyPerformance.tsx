import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HourlyPerformanceItem } from '../types';

interface HourlyPerformanceProps {
  items: HourlyPerformanceItem[];
}

export const HourlyPerformance: React.FC<HourlyPerformanceProps> = ({ items }) => {
  const maxRevenue = Math.max(...items.map((item) => item.revenue), 1);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Hourly Performance</CardTitle>
        <CardDescription>Busiest paid sales windows</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {items.length > 0 ? items.map((item) => (
            <div key={item.hour} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span>{item.hour}</span>
                <span>{item.revenue.toLocaleString()} Birr</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-info" style={{ width: `${(item.revenue / maxRevenue) * 100}%` }} />
                </div>
                <span className="w-16 text-right text-[10px] text-muted-foreground">{item.orders} orders</span>
              </div>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground font-bold text-center py-12">
              No hourly sales data in the selected window.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyPerformance;
