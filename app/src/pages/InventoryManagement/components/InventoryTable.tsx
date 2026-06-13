import React from 'react';
import { Edit3, Trash2, AlertTriangle, Package, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { NormalizedInventoryItem } from '../types';

interface InventoryTableProps {
  loading: boolean;
  filtered: NormalizedInventoryItem[];
  openQty: (item: NormalizedInventoryItem) => void;
  openHistory: (item: NormalizedInventoryItem) => void;
  openEdit: (item: NormalizedInventoryItem) => void;
  deleteItem: (item: NormalizedInventoryItem) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  loading,
  filtered,
  openQty,
  openHistory,
  openEdit,
  deleteItem
}) => {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Stock by Location</TableHead>
                <TableHead className="hidden sm:table-cell">Min</TableHead>
                <TableHead className="hidden sm:table-cell">Unit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map(it => {
                const stockByLocation: any[] = Array.isArray((it as any).stock_by_location)
                  ? (it as any).stock_by_location
                  : [];
                const min = parseFloat(String(it.min_quantity || 0));
                const minMode = (it as any).min_quantity_mode || 'global';
                const piecesPerUnit = Math.max(1, parseFloat(String((it as any).pieces_per_unit || 1)) || 1);

                // Compute total stock for low-stock check
                const totalQty = stockByLocation.length > 0
                  ? stockByLocation.reduce((sum, s) => sum + parseFloat(String(s.quantity || 0)), 0)*piecesPerUnit
                  : parseFloat(String(it.store_quantity ?? it.quantity ?? 0)) * piecesPerUnit;
                const totalMinQty = minMode === 'per_location' && stockByLocation.length > 0
                  ? stockByLocation.reduce((sum, s) => sum + parseFloat(String(s.min_quantity || 0)), 0)
                  : min;
                
                // Low stock logic based on mode
                let low = false;
                if (minMode === 'per_location' && stockByLocation.length > 0) {
                  // Compare total stock against the combined per-location minimums.
                  low = Number.isFinite(totalMinQty) && totalMinQty > 0 && totalQty < totalMinQty;
                } else {
                  // Global mode: check total against global min
                  low = Number.isFinite(min) && min > 0 && totalQty < min;
                }

                return (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{it.name}</div>
                      {low && (
                        <div className="flex items-center gap-1 text-destructive text-xs mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Low Stock</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {stockByLocation.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {stockByLocation.map((s: any) => {
                            const locMin = parseFloat(String(s.min_quantity || 0));
                            const qty = parseFloat(String(s.quantity || 0));
                            const isLocLow = minMode === 'per_location' && locMin > 0 && qty < locMin;
                            return (
                              <div key={s.location_id} className="text-sm">
                                <span className="text-muted-foreground text-xs mr-1">{s.location_name}:</span>
                                <span className={`font-bold ${isLocLow ? 'text-destructive' : ''}`}>
                                  {s.quantity}
                                </span>
                                {minMode === 'per_location' && locMin > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (min: {locMin})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className={`font-bold text-base ${low ? 'text-destructive' : ''}`}>
                          {totalQty}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{min || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground capitalize">
                      {it.unit || 'piece'}
                      {Number(it.pieces_per_unit || 1) > 1 ? ` (${it.pieces_per_unit} ${it.base_unit || 'pieces'})` : ''}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openQty(it)}>
                          Update Qty
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHistory(it)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(it)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteItem(it)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      icon={<Package />}
                      title="No items found"
                      description="Add inventory items to track stock"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryTable;
