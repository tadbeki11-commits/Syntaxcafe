import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InventoryFormData, StockLocation } from '../types';

interface InventoryFormDialogProps {
  editDialog: boolean;
  setEditDialog: (open: boolean) => void;
  isAdding: boolean;
  isSubmitting?: boolean;
  formData: InventoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<InventoryFormData>>;
  submitForm: (e: React.FormEvent) => void;
  stockLocations: StockLocation[];
}

export const InventoryFormDialog: React.FC<InventoryFormDialogProps> = ({
  editDialog,
  setEditDialog,
  isAdding,
  isSubmitting = false,
  formData,
  setFormData,
  submitForm,
  stockLocations
}) => {


  const handleMinQuantityChange = (locationId: number, minQuantity: number) => {
    setFormData(p => {
      const currentStock = p.initial_stock || [];
      const existingIndex = currentStock.findIndex(s => s.location_id === locationId);
      let newStock;

      if (existingIndex >= 0) {
        newStock = currentStock.map((s, idx) =>
          idx === existingIndex ? { ...s, min_quantity: minQuantity } : s
        );
      } else {
        newStock = [...currentStock, { location_id: locationId, quantity: 0, min_quantity: minQuantity }];
      }

      return { ...p, initial_stock: newStock };
    });
  };

  const getMinQuantity = (locationId: number) => {
    const stockEntry = formData.initial_stock?.find(s => s.location_id === locationId);
    return stockEntry?.min_quantity ?? 0;
  };

  return (
    <Dialog open={editDialog} onOpenChange={setEditDialog}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAdding ? 'Add Inventory Item' : 'Edit Inventory Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitForm} className="space-y-4">
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Item name"
              required
            />
          </div>

          <div>
            <Label>Minimum Stock</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={formData.min_quantity}
              onChange={e => setFormData(p => ({ ...p, min_quantity: parseFloat(e.target.value) || 0 }))}
            />
          </div>


          <div className="space-y-2">
            <Label>Pieces per Unit</Label>
            <Input
              type="number"
              step="1"
              min="1"
              value={formData.pieces_per_unit}
              onChange={e => setFormData(p => ({ ...p, pieces_per_unit: parseFloat(e.target.value) || 1 }))}
            />
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Purchase Unit</Label>
              <Input
                value={formData.unit}
                onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                placeholder="box, piece, bag..."
              />
            </div>

            <div className="space-y-2">
              <Label>Base Unit</Label>
              <Input
                value={formData.base_unit}
                onChange={e => setFormData(p => ({ ...p, base_unit: e.target.value }))}
                placeholder="piece"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditDialog(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isAdding ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryFormDialog;
