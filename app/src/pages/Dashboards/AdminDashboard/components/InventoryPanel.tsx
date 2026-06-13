import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InventoryPanelProps {
  items: any[];
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Inventory & Ingredient Levels</CardTitle>
          <CardDescription>
            Critically low ingredients or surplus levels
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/dashboard/inventory')}
        >
          Manage Inventory
        </Button>
      </CardHeader>
      <CardContent className="pt-6 overflow-x-auto">
        <div className="min-w-[600px] space-y-2">
          <div className="grid grid-cols-5 text-[10px] uppercase font-bold text-muted-foreground pb-2 border-b">
            <div>Ingredient</div>
            <div>Current stock</div>
            <div>Unit type</div>
            <div>Min threshold</div>
            <div className="text-right">Action Required</div>
          </div>

          {items.length > 0 ? (
            items.map((item: any) => {
              const stockByLocation: any[] = Array.isArray(item?.stock_by_location)
                ? item.stock_by_location
                : [];
              const piecesPerUnit = Math.max(1, Number(item?.pieces_per_unit || 1) || 1);
              const totalQty = stockByLocation.length > 0
                ? stockByLocation.reduce((sum: number, s: any) => sum + Number(s?.quantity || 0), 0)
                : Number(item?.quantity || item?.store_quantity || 0) * piecesPerUnit;
              const minQuantity = Number(item?.min_quantity || 0);
              const minMode = String(item?.min_quantity_mode || 'global');
              const totalMinQty = minMode === 'per_location' && stockByLocation.length > 0
                ? stockByLocation.reduce((sum: number, s: any) => sum + Number(s?.min_quantity || 0), 0)
                : minQuantity;
              const isLow = totalMinQty > 0 && totalQty < totalMinQty;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-5 text-xs font-bold text-foreground py-3 border-b hover:bg-muted/10 transition-colors rounded-xl px-1 items-center"
                >
                  <div className="text-foreground font-extrabold truncate pr-2">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${isLow ? 'bg-destructive animate-pulse' : 'bg-success'}`}
                    ></span>
                    <span className={isLow ? 'text-destructive font-black' : ''}>
                      {totalQty}
                    </span>
                  </div>
                  <div>
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                      {item.unit}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">{totalMinQty}</div>
                  <div className="text-right">
                    <Badge
                      variant={isLow ? 'destructive' : 'success'}
                      className="text-[9px] uppercase py-0 px-2"
                    >
                      {isLow ? 'Restock ASAP' : 'Sufficient'}
                    </Badge>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
              No inventory data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
