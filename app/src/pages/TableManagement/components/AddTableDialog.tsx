import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TableFormData } from '../types';

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: TableFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<TableFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const AddTableDialog: React.FC<AddTableDialogProps> = ({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Table</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="number">Table Number</Label>
            <Input
              id="number"
              type="number"
              min="1"
              value={formData.number}
              onChange={e => onFormDataChange(p => ({ ...p, number: e.target.value }))}
              placeholder="e.g., 13"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (People)</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={e => onFormDataChange(p => ({ ...p, capacity: e.target.value }))}
              placeholder="e.g., 4"
              required
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Create Table</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default AddTableDialog;
