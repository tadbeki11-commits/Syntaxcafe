import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ExpenseRow {
  item: string;
  cost: string;
}

interface ExpenseRowEditorProps {
  rows: ExpenseRow[];
  onChange: (rows: ExpenseRow[]) => void;
  total: number;
  showTotal?: boolean;
  disabled?: boolean;
}

const emptyRow = (): ExpenseRow => ({ item: '', cost: '' });

export const ExpenseRowEditor: React.FC<ExpenseRowEditorProps> = ({
  rows,
  onChange,
  total,
  showTotal = true,
  disabled = false,
}) => {
  const addRow = () => onChange([...rows, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof ExpenseRow, value: string) => {
    const updated = rows.slice();
    if (!updated[index]) return;
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {rows.map((r, idx) => (
        <div key={idx} className="flex gap-3 items-center">
          <Input
            type="text"
            value={r.item}
            placeholder="Item purchased"
            onChange={(e) => updateRow(idx, 'item', e.target.value)}
            className="flex-1"
            disabled={disabled}
          />
          <Input
            type="number"
            value={r.cost}
            placeholder="Cost"
            onChange={(e) => updateRow(idx, 'cost', e.target.value)}
            className="w-36"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeRow(idx)}
            disabled={rows.length <= 1 || disabled}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
        {showTotal && (
          <span className="text-sm font-semibold">Total: {total.toFixed(2)} Birr</span>
        )}
      </div>
    </div>
  );
};

export default ExpenseRowEditor;
