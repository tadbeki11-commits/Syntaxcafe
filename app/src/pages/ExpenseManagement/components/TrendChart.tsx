import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendData } from '../types';
import { formatCurrency } from '../utils';

interface TrendChartProps {
  title: string;
  data: TrendData[];
  colorClass: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ title, data, colorClass }) => {
  const normalized = Array.isArray(data) ? data : [];
  const maxAmount = normalized.reduce((max, item) => Math.max(max, Number.parseFloat(String(item?.amount || 0))), 0);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end min-h-[200px]">
        {normalized.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed rounded-xl bg-muted/40 text-xs text-muted-foreground font-bold p-6">
            No trend data available
          </div>
        ) : (
          <div className="flex items-end gap-2 overflow-x-auto bg-muted/40 rounded-xl p-3 h-48">
            {normalized.map((item) => {
              const amount = Number.parseFloat(String(item?.amount || 0));
              const height = maxAmount > 0 ? Math.max(12, Math.round((amount / maxAmount) * 110)) : 12;
              return (
                <div key={item?.label} className="flex min-w-[50px] flex-1 flex-col items-center justify-end gap-1.5 h-full">
                  <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">{formatCurrency(amount).replace(' Birr', '')}</span>
                  <div className={`w-full rounded-t-lg ${colorClass}`} style={{ height }} />
                  <span className="text-center text-[9px] text-muted-foreground truncate w-full font-medium">{item?.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default TrendChart;
