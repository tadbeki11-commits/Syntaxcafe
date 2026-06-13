import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, Square, Smartphone, CreditCard } from 'lucide-react';
import { PaymentMethodFormData } from '../types';

const AVAILABLE_ICONS = [
  { label: 'Cash', value: 'dollar-sign', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Card', value: 'credit-card', icon: <CreditCard className="w-4 h-4" /> },
  { label: 'QR', value: 'square', icon: <Square className="w-4 h-4" /> },
  { label: 'Mobile', value: 'smartphone', icon: <Smartphone className="w-4 h-4" /> },
];

interface PaymentMethodFormDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedMethod: any;
  formData: PaymentMethodFormData;
  setFormData: React.Dispatch<React.SetStateAction<PaymentMethodFormData>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const PaymentMethodFormDialog: React.FC<PaymentMethodFormDialogProps> = ({
  dialogOpen,
  setDialogOpen,
  selectedMethod,
  formData,
  setFormData,
  saving,
  onSubmit,
}) => {
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedMethod ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
              placeholder="e.g. Cash Payment"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">System Key (lowercase, no spaces)</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              placeholder="e.g. cash"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_ICONS.map(item => (
                <Button
                  key={item.value}
                  type="button"
                  variant={formData.icon === item.value ? 'default' : 'outline'}
                  className="h-10 flex items-center gap-1.5 text-[10px] font-bold"
                  onClick={() => setFormData(p => ({ ...p, icon: item.value }))}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description shown to cashier"
              className="resize-none h-16"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={checked => setFormData(p => ({ ...p, is_active: !!checked }))}
            />
            <Label htmlFor="is_active" className="cursor-pointer text-sm">Active</Label>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : selectedMethod ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
