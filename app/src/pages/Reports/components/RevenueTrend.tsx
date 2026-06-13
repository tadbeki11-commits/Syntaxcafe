import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RevenueTrendPoint } from '../types';

interface RevenueTrendProps {
  points: RevenueTrendPoint[];
}

export const RevenueTrend: React.FC<RevenueTrendProps> = ({ points }) => {
  const maxRevenue = Math.max(...points.map((point) => point.revenue), 1);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b">
        <div>
          <CardTitle className="text-base">Revenue Trend</CardTitle>
          <CardDescription>Paid sales by business day</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {points.length > 0 ? (
          <div className="h-64 flex items-end gap-2 border-b border-l px-3 pb-4">
            {points.map((point) => (
              <div key={point.label} className="flex flex-1 min-w-0 flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-44">
                  <div
                    className="w-full max-w-10 rounded-t-md bg-primary"
                    style={{ height: `${Math.max(8, (point.revenue / maxRevenue) * 100)}%` }}
                    title={`${point.revenue.toLocaleString()} Birr`}
                  />
                </div>
                <div className="text-[10px] font-bold text-muted-foreground truncate w-full text-center">{point.label}</div>
                <div className="text-[10px] text-muted-foreground">{point.orders}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 rounded-md border border-dashed bg-muted/20 flex items-center justify-center text-xs font-bold text-muted-foreground">
            No paid revenue found for the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueTrend;
