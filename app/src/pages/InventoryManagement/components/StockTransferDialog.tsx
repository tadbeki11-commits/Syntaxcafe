import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowRight, Package } from 'lucide-react';
import { NormalizedInventoryItem, StockTransferFormData, MultiTransferLineItem } from '../types';
import api from '@/application';

interface StockTransferDialogProps {
  transferDialog: boolean;
  setTransferDialog: (open: boolean) => void;
  items: NormalizedInventoryItem[];
  isSubmitting?: boolean;
  transferData: StockTransferFormData;
  setTransferData: React.Dispatch<React.SetStateAction<StockTransferFormData>>;
  submitTransfer: (e: React.FormEvent) => void;
}

const emptyLine = (): MultiTransferLineItem => ({
  inventory_item_id: '',
  quantity: '',
  quantity_unit: 'base',
});

export const StockTransferDialog: React.FC<StockTransferDialogProps> = ({
  transferDialog,
  setTransferDialog,
  items,
  isSubmitting = false,
  transferData,
  setTransferData,
  submitTransfer,
}) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [draftLine, setDraftLine] = useState<MultiTransferLineItem>(emptyLine());
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (!transferDialog) return;
    setDraftLine(emptyLine());
    setAddError('');
    api.stockLocations.getAll(false).then((res: any) => {
      const locs = res?.data?.data?.locations ?? res?.data?.locations ?? [];
      const normalized = (Array.isArray(locs) ? locs : [])
        .filter((l: any) => l.isActive !== false && l.is_active !== 0)
        .map((l: any) => ({
          ...l,
          // Use server remote ID so it matches stock_by_location[].location_id
          id: l.remoteId ?? l.remote_id ?? l.id,
        }));
      setLocations(normalized);
    }).catch(() => setLocations([]));
  }, [transferDialog]);

  // Auto-select default from_location when locations load and none is chosen
  useEffect(() => {
    if (!transferData.from_location && locations.length > 0) {
      const defaultLoc = locations.find((l: any) => l.is_default) ?? locations[0];
      if (defaultLoc) {
        setTransferData(p => ({ ...p, from_location: String(defaultLoc.id) }));
      }
    }
  }, [locations, transferData.from_location, setTransferData]);

  const fromLocationId = transferData.from_location ? parseInt(transferData.from_location, 10) : null;

  // Items already in the list (to prevent duplicates)
  const addedItemIds = new Set(transferData.lines.map(l => l.inventory_item_id));

  // Available items for the draft dropdown (not already added)
  const availableItems = items.filter(it => !addedItemIds.has(String(it.id)));

  const getStockAtLocation = (item: NormalizedInventoryItem, locId: number | null) => {
    if (!locId) return item.store_quantity ?? item.quantity ?? 0;
    const entry = Array.isArray((item as any).stock_by_location)
      ? ((item as any).stock_by_location as any[]).find((s: any) => s.location_id === locId)
      : null;
    return entry ? entry.quantity : 0;
  };

  const draftItem = items.find(it => String(it.id) === draftLine.inventory_item_id);
  const draftPiecesPerUnit = Math.max(1, Number(draftItem?.pieces_per_unit || 1));
  const draftBaseQty =
    draftLine.quantity_unit === 'purchase'
      ? Number(draftLine.quantity || 0) * draftPiecesPerUnit
      : Number(draftLine.quantity || 0);
  const draftAvailable = draftItem ? getStockAtLocation(draftItem, fromLocationId) : 0;

  const handleAddLine = () => {
    setAddError('');
    if (!draftLine.inventory_item_id) { setAddError('Select an item'); return; }
    const qty = parseFloat(draftLine.quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setAddError('Enter a valid quantity'); return; }
    if (draftBaseQty > Number(draftAvailable)) {
      setAddError(`Only ${draftAvailable} ${draftItem?.base_unit || 'pieces'} available at source`);
      return;
    }
    setTransferData(p => ({ ...p, lines: [...p.lines, { ...draftLine }] }));
    setDraftLine(emptyLine());
  };

  const handleRemoveLine = (idx: number) => {
    setTransferData(p => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));
  };

  const updateLine = (idx: number, patch: Partial<MultiTransferLineItem>) => {
    setTransferData(p => ({
      ...p,
      lines: p.lines.map((l, i) => i === idx ? { ...l, ...patch } : l),
    }));
  };

  const fromLocName = locations.find(l => String(l.id) === transferData.from_location)?.name ?? '—';
  const toLocName = locations.find(l => String(l.id) === transferData.to_location)?.name ?? '—';

  return (
    <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Transfer Stock Between Locations
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submitTransfer} className="space-y-5">

          {/* ── Location row ── */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>From Location</Label>
              <select
                value={transferData.from_location}
                onChange={e => setTransferData(p => ({ ...p, from_location: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Source…</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="pb-2 text-muted-foreground">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="space-y-1.5">
              <Label>To Location</Label>
              <select
                value={transferData.to_location}
                onChange={e => setTransferData(p => ({ ...p, to_location: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Destination…</option>
                {locations
                  .filter((loc: any) => String(loc.id) !== transferData.from_location)
                  .map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* ── Add item row ── */}
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Items to Transfer</p>

            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
              {/* Item selector */}
              <div className="space-y-1">
                <Label className="text-xs">Item</Label>
                <select
                  value={draftLine.inventory_item_id}
                  onChange={e => {
                    setAddError('');
                    setDraftLine(p => ({ ...p, inventory_item_id: e.target.value }));
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Choose item…</option>
                  {availableItems.map(item => {
                    const avail = getStockAtLocation(item, fromLocationId);
                    return (
                      <option key={item.id} value={item.id}>
                        {item.name} ({avail} {item.base_unit || 'pcs'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1 w-24">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  value={draftLine.quantity}
                  onChange={e => { setAddError(''); setDraftLine(p => ({ ...p, quantity: e.target.value })); }}
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </div>

              {/* Unit */}
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <select
                  value={draftLine.quantity_unit}
                  onChange={e => setDraftLine(p => ({ ...p, quantity_unit: e.target.value as 'base' | 'purchase' }))}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="base">{draftItem?.base_unit || 'piece'}</option>
                  <option value="purchase">{draftItem?.unit || 'box'}</option>
                </select>
              </div>

              {/* Add button */}
              <Button type="button" size="sm" className="h-9 mt-5" onClick={handleAddLine}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Inline preview for draft item */}
            {draftItem && draftLine.quantity && (
              <p className="text-xs text-muted-foreground">
                Will move <strong>{Number.isFinite(draftBaseQty) ? draftBaseQty : 0} {draftItem.base_unit || 'pieces'}</strong>.
                Available: <strong>{draftAvailable}</strong> {draftItem.base_unit || 'pieces'}.
              </p>
            )}

            {addError && (
              <p className="text-xs text-destructive">{addError}</p>
            )}
          </div>

          {/* ── Line items list ── */}
          {transferData.lines.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Items to Transfer ({transferData.lines.length})
              </p>

              {/* Summary badge */}
              {transferData.from_location && transferData.to_location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Badge variant="outline" className="text-xs font-normal">{fromLocName}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline" className="text-xs font-normal">{toLocName}</Badge>
                </div>
              )}

              <div className="rounded-md border divide-y">
                {transferData.lines.map((line, idx) => {
                  const lineItem = items.find(it => String(it.id) === line.inventory_item_id);
                  const linePpu = Math.max(1, Number(lineItem?.pieces_per_unit || 1));
                  const lineBaseQty = line.quantity_unit === 'purchase'
                    ? Number(line.quantity || 0) * linePpu
                    : Number(line.quantity || 0);
                  const lineAvail = lineItem ? getStockAtLocation(lineItem, fromLocationId) : 0;
                  const overStock = lineBaseQty > Number(lineAvail);

                  return (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{lineItem?.name ?? 'Unknown'}</span>
                          {overStock && (
                            <Badge variant="destructive" className="text-xs">Over stock</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lineBaseQty} {lineItem?.base_unit || 'pieces'} base
                          {line.quantity_unit === 'purchase' ? ` (${line.quantity} ${lineItem?.unit || 'box'})` : ''}
                          {' · '}Available: {lineAvail} {lineItem?.base_unit || 'pieces'}
                        </div>
                      </div>

                      {/* Inline qty edit */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          value={line.quantity}
                          onChange={e => updateLine(idx, { quantity: e.target.value })}
                          className="h-8 w-20 text-sm"
                        />
                        <select
                          value={line.quantity_unit}
                          onChange={e => updateLine(idx, { quantity_unit: e.target.value as 'base' | 'purchase' })}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="base">{lineItem?.base_unit || 'piece'}</option>
                          <option value="purchase">{lineItem?.unit || 'box'}</option>
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveLine(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input
              value={transferData.notes}
              onChange={e => setTransferData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Reason for transfer, batch number, etc."
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setTransferDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || transferData.lines.length === 0 || !transferData.from_location || !transferData.to_location}
            >
              {isSubmitting
                ? 'Transferring…'
                : `Transfer${transferData.lines.length > 0 ? ` (${transferData.lines.length} item${transferData.lines.length > 1 ? 's' : ''})` : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockTransferDialog;
