import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TopItem } from '../types';

interface PopularMenuItemsProps {
  topItems: TopItem[];
  topItemsPeriod: string;
  setTopItemsPeriod: (period: string) => void;
}

export const PopularMenuItems: React.FC<PopularMenuItemsProps> = ({
  topItems,
  topItemsPeriod,
  setTopItemsPeriod
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Popular Menu Items</CardTitle>
          <CardDescription>Most frequently bought dishes</CardDescription>
        </div>
        <Select value={topItemsPeriod} onValueChange={setTopItemsPeriod}>
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="selected_range">Selected range</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="all_time">All time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {topItems.length > 0 ? (
            topItems.map((item, index) => (
              <div 
                key={item.name} 
                className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/10 transition-colors font-semibold"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-black">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">
                      {(item.revenue || 0).toLocaleString()} Birr
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs font-black">
                    {item.sold} sold
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
              No item summary found for the selected filters and period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PopularMenuItems;
