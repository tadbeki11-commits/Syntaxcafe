import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Edit3, Trash2 } from 'lucide-react';
import { NormalizedInventoryItem } from '../types';
import { FormattedQuantity } from '../hooks/useQuantityFormatter';

interface ItemsTableProps {
  items: NormalizedInventoryItem[];
  selectedLocationId: number | null;
  selectedLocationDefault: boolean;
  formatQuantity: (qty: number, piecesPerUnit: number, purchaseUnit: string, baseUnit: string) => FormattedQuantity;
  onUpdateQty: (item: NormalizedInventoryItem) => void;
  onHistory: (item: NormalizedInventoryItem) => void;
  onEdit: (item: NormalizedInventoryItem) => void;
  onDelete: (item: NormalizedInventoryItem) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  selectedLocationId,
  selectedLocationDefault,
  formatQuantity,
  onUpdateQty,
  onHistory,
  onEdit,
  onDelete
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="font-semibold text-foreground">Item</TableHead>
          <TableHead className="font-semibold text-center text-foreground">Stock (Purchase Unit)</TableHead>
          <TableHead className="font-semibold text-center text-foreground">Stock (Base Unit)</TableHead>
          <TableHead className="font-semibold text-center text-foreground">Unit Configuration</TableHead>
          <TableHead className="font-semibold text-center text-foreground">Limit &amp; Status</TableHead>
          <TableHead className="text-right font-semibold text-foreground pr-4">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length > 0 ? (
          items.map(item => {
            const entry = item.stock_by_location?.find((s: any) => s.location_id === selectedLocationId);
            const qty = entry ? Number(entry.quantity) : 0;
            const piecesPerUnit = Math.max(1, Number(item.pieces_per_unit || 1));
            
            const formatted = formatQuantity(qty, piecesPerUnit, item.unit || 'Unit', item.base_unit || 'pcs');
            
            const minMode = (item as any).min_quantity_mode || 'global';
            let isLow = false;
            let limitText = '—';
            
            if (minMode === 'per_location') {
              const locMin = entry?.min_quantity != null ? Number(entry.min_quantity) : 0;
              isLow = locMin > 0 && qty < locMin;
              if (locMin > 0) limitText = `${locMin} ${item.base_unit || 'pcs'}`;
            } else {
              const globalMin = Number(item.min_quantity || 0);
              isLow = selectedLocationDefault && globalMin > 0 && qty < globalMin;
              if (globalMin > 0) limitText = `${globalMin} ${item.base_unit || 'pcs'} (Global)`;
            }

            return (
              <TableRow key={item.id} className={isLow ? 'bg-destructive/[0.03] hover:bg-destructive/[0.06]' : 'hover:bg-muted/50'}>
                <TableCell className="font-medium text-sm pl-4">
                  <div className="font-bold text-foreground">{item.name}</div>
                  {item.notes && (
                    <div className="text-xs text-muted-foreground max-w-[240px] truncate mt-0.5">{item.notes}</div>
                  )}
                </TableCell>
                <TableCell className="text-center font-mono">
                  <div className="font-bold text-sm text-primary">
                    {piecesPerUnit > 1 ? formatted.fractional : '—'}
                  </div>
                </TableCell>
                <TableCell className="text-center font-mono font-semibold text-sm">
                  {formatted.totalBase}
                </TableCell>
                <TableCell className="text-center">
                  {piecesPerUnit > 1 ? (
                    <span className="inline-block bg-muted/60 px-2 py-0.5 rounded border text-[11px] font-mono font-medium">
                      1 {item.unit || 'Box'} = {piecesPerUnit} {item.base_unit || 'pcs'}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">Single unit item</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    {qty === 0 ? (
                      <Badge variant="destructive" className="text-[10px] py-0 px-2 font-medium">Out of Stock</Badge>
                    ) : isLow ? (
                      <Badge variant="warning" className="text-[10px] py-0 px-2 font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">Low Stock</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Healthy</Badge>
                    )}
                  
                  </div>
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all font-medium" 
                      onClick={() => onUpdateQty(item)}
                    >
                      Update Qty
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:bg-muted" 
                      onClick={() => onHistory(item)}
                      title="Stock History"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:bg-muted" 
                      onClick={() => onEdit(item)}
                      title="Edit Item"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => onDelete(item)}
                      title="Delete Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
              No items available
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default ItemsTable;
