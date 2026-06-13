import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategorySalesItem } from '../types';

interface CategorySalesProps {
  items: CategorySalesItem[];
}

export const CategorySales: React.FC<CategorySalesProps> = ({ items }) => {
  const maxRevenue = Math.max(...items.map((item) => item.revenue), 1);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Category Sales</CardTitle>
        <CardDescription>Revenue and quantity by menu category</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {items.length > 0 ? items.map((item) => (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="truncate capitalize">{item.name}</span>
                <span className="shrink-0">{item.revenue.toLocaleString()} Birr</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(item.revenue / maxRevenue) * 100}%` }} />
                </div>
                <span className="w-16 text-right text-[10px] text-muted-foreground">{item.quantity} sold</span>
              </div>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground font-bold text-center py-12">
              No category sales in the selected window.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategorySales;
