import React from 'react';
import { Plus, Edit3, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ExpenseFormData } from '../types';

interface ExpenseFormProps {
  isEditMode: boolean;
  formData: ExpenseFormData;
  categories: string[];
  paymentMethods: string[];
  submitting: boolean;
  onFormChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCategoryChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isEditMode,
  formData,
  categories,
  paymentMethods,
  submitting,
  onFormChange,
  onCategoryChange,
  onPaymentMethodChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <Card className="lg:col-span-1 h-fit">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base">{isEditMode ? 'Edit Expense Entry' : 'New Expense Entry'}</CardTitle>
          <CardDescription>Enter details of the outgoing spend</CardDescription>
        </div>
        {isEditMode && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Expense Title *</Label>
            <Input
              name="title"
              value={formData.title}
              onChange={onFormChange}
              placeholder="e.g. Monthly electricity bill"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={onCategoryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (Birr) *</Label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={onFormChange}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Paid To *</Label>
              <Input
                name="paid_to"
                value={formData.paid_to}
                onChange={onFormChange}
                placeholder="e.g. Supplier, EEU"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={onPaymentMethodChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={onFormChange}
              rows={3}
              className="resize-none"
              placeholder="Audit context..."
            />
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {isEditMode ? <Edit3 className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {submitting ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
            </Button>
            {isEditMode && (
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
export default ExpenseForm;
