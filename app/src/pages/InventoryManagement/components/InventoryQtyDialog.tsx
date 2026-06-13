import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Minus, RefreshCw } from 'lucide-react';
import { NormalizedInventoryItem, InventoryQtyData, StockLocation } from '../types';

interface InventoryQtyDialogProps {
  qtyDialog: boolean;
  setQtyDialog: (open: boolean) => void;
  selectedItem: NormalizedInventoryItem | null;
  qtyData: InventoryQtyData;
  setQtyData: React.Dispatch<React.SetStateAction<InventoryQtyData>>;
  submitQty: (e: React.FormEvent) => void;
  stockLocations: StockLocation[];
}

export const InventoryQtyDialog: React.FC<InventoryQtyDialogProps> = ({
  qtyDialog,
  setQtyDialog,
  selectedItem,
  qtyData,
  setQtyData,
  submitQty,
  stockLocations
}) => {
  const piecesPerUnit = Math.max(1, Number(selectedItem?.pieces_per_unit || 1));
  const currentUnit = qtyData.quantity_unit || 'base';
  
  // Get current stock at selected location
  const selectedLocationId = qtyData.location_id;
  const stockByLocation: any[] = Array.isArray(selectedItem?.stock_by_location)
    ? selectedItem.stock_by_location
    : [];
  const currentStock = selectedLocationId 
    ? stockByLocation.find((s: any) => s.location_id === selectedLocationId)?.quantity ?? 0
    : (selectedItem?.store_quantity ?? selectedItem?.quantity ?? 0);
  
  const handleQuantityChange = (value: string, unit: 'base' | 'purchase') => {
    const numValue = parseFloat(value) || 0;
    const baseValue = unit === 'purchase' ? numValue * piecesPerUnit : numValue;
    
    setQtyData(p => ({ 
      ...p, 
      quantity: String(baseValue),
      quantity_unit: unit
    }));
  };

  const handleDeltaChange = (value: string, unit: 'base' | 'purchase') => {
    const numValue = parseFloat(value) || 0;
    const baseValue = unit === 'purchase' ? numValue * piecesPerUnit : numValue;
    
    setQtyData(p => ({ 
      ...p, 
      delta: String(baseValue),
      quantity_unit: unit
    }));
  };

  const displayQuantity = currentUnit === 'purchase' && qtyData.quantity 
    ? parseFloat(qtyData.quantity) / piecesPerUnit 
    : parseFloat(qtyData.quantity || '0');
  
  const displayDelta = currentUnit === 'purchase' && qtyData.delta
    ? parseFloat(qtyData.delta) / piecesPerUnit
    : parseFloat(qtyData.delta || '0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure we're sending base units to the API
    const finalQtyData = { ...qtyData };
    if (currentUnit === 'purchase') {
      if (qtyData.mode === 'delta') {
        finalQtyData.delta = String(parseFloat(qtyData.delta || '0'));
      } else {
        finalQtyData.quantity = String(parseFloat(qtyData.quantity || '0'));
      }
    }
    submitQty(e);
  };

  const modeOptions = [
    {
      value: 'set',
      icon: RefreshCw,
      title: 'Set Exact Quantity',
      description: 'Replace current stock with a specific amount',
      color: 'bg-info/10 border-info/30 hover:bg-info/15'
    },
    {
      value: 'delta',
      icon: Plus,
      title: 'Add / Subtract',
      description: 'Increase or decrease current stock',
      color: 'bg-success/10 border-success/30 hover:bg-success/15'
    }
  ];

  return (
    <Dialog open={qtyDialog} onOpenChange={setQtyDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Stock Quantity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm">
              <span className="text-muted-foreground">Item:</span>{' '}
              <span className="font-semibold text-foreground">{selectedItem?.name}</span>
            </p>
            <p className="text-sm mt-1">
              <span className="text-muted-foreground">Current stock:</span>{' '}
              <span className="font-semibold">{currentStock} {selectedItem?.base_unit || 'pieces'}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label>What would you like to do?</Label>
            <div className="grid grid-cols-2 gap-3">
              {modeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer border-2 rounded-lg p-4 transition-colors ${
                      qtyData.mode === option.value
                        ? `${option.color} border-current`
                        : 'bg-muted/30 border-muted hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={option.value}
                      checked={qtyData.mode === option.value}
                      onChange={() => setQtyData(p => ({ ...p, mode: option.value }))}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Icon className="h-6 w-6" />
                      <div>
                        <div className="font-medium text-sm">{option.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <select
              value={qtyData.location_id || qtyData.location || ''}
              onChange={e => {
                const selectedLocationId = parseInt(e.target.value, 10);
                setQtyData(p => ({ 
                  ...p, 
                  location_id: selectedLocationId || null,
                  location: '' // Clear legacy location field when using dynamic locations
                }));
              }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select location</option>
              {stockLocations
                .filter((l: StockLocation) => l.active !== false)
                .map((location: StockLocation) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
          </div>

          {qtyData.mode === 'delta' ? (
            <div className="space-y-2">
              <Label>Quantity to Add/Subtract</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  value={displayDelta}
                  onChange={e => handleDeltaChange(e.target.value, currentUnit)}
                  placeholder="e.g. 5 to add, -2 to subtract"
                  className="text-lg"
                />
                <select
                  value={currentUnit}
                  onChange={e => handleDeltaChange(qtyData.delta, e.target.value as 'base' | 'purchase')}
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="base">{selectedItem?.base_unit || 'piece'}</option>
                  <option value="purchase">{selectedItem?.unit || 'box'}</option>
                </select>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="text-success">
                  <Plus className="inline h-3 w-3 mr-1" />
                  Enter positive number to add stock
                </div>
                <div className="text-destructive">
                  <Minus className="inline h-3 w-3 mr-1" />
                  Enter negative number to remove stock
                </div>
              </div>
              {currentUnit === 'purchase' && piecesPerUnit > 1 && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  System will record: <strong>{qtyData.delta || 0} {selectedItem?.base_unit || 'pieces'}</strong>
                  <br />
                  (1 {selectedItem?.unit || 'box'} = {piecesPerUnit} {selectedItem?.base_unit || 'pieces'})
                </div>
              )}
              {displayDelta !== 0 && (
                <div className="text-sm p-2 bg-muted/50 rounded">
                  New total will be: <strong>{currentStock + (qtyData.delta ? parseFloat(qtyData.delta) : 0)} {selectedItem?.base_unit || 'pieces'}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>New Total Quantity</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={displayQuantity}
                  onChange={e => handleQuantityChange(e.target.value, currentUnit)}
                  className="text-lg"
                />
                <select
                  value={currentUnit}
                  onChange={e => handleQuantityChange(qtyData.quantity, e.target.value as 'base' | 'purchase')}
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="base">{selectedItem?.base_unit || 'piece'}</option>
                  <option value="purchase">{selectedItem?.unit || 'box'}</option>
                </select>
              </div>
              <div className="text-xs text-muted-foreground">
                This will replace the current stock of {currentStock} {selectedItem?.base_unit || 'pieces'}
              </div>
              {currentUnit === 'purchase' && piecesPerUnit > 1 && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  System will record: <strong>{qtyData.quantity || 0} {selectedItem?.base_unit || 'pieces'}</strong>
                  <br />
                  (1 {selectedItem?.unit || 'box'} = {piecesPerUnit} {selectedItem?.base_unit || 'pieces'})
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setQtyDialog(false)}>Cancel</Button>
            <Button type="submit">
              {qtyData.mode === 'delta' ? 'Update Stock' : 'Set Quantity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryQtyDialog;
