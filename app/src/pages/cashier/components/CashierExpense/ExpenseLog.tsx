import React from 'react';
import { Calendar, Pencil, Trash2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApproximateServerIsoString } from '@/shared/utils/serverTime';

export interface ExpenseEntry {
  id: number;
  created_at: string;
  total: number;
  items: Array<{ item: string; cost: number }>;
}

interface ExpenseLogProps {
  entries: ExpenseEntry[];
  grandTotal: number;
  onEdit: (entry: ExpenseEntry) => void;
  onDelete: (entry: ExpenseEntry) => void;
  deletingId: number | null;
}

export const ExpenseLog: React.FC<ExpenseLogProps> = ({
  entries,
  grandTotal,
  onEdit,
  onDelete,
  deletingId,
}) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Receipt className="h-8 w-8 mb-2 opacity-40" />
        No expenses found for this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
        <span className="font-semibold">Total: {grandTotal.toFixed(2)} Birr</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right w-32">Total</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(entry.created_at || getApproximateServerIsoString()).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    {entry.items?.map((it, i) => (
                      <div key={i} className="flex justify-between gap-4">
                        <span>{it.item}</span>
                        <span className="text-muted-foreground">{it.cost.toFixed(2)} Birr</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {Number(entry.total || 0).toFixed(2)} Birr
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(entry)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(entry)}
                      disabled={deletingId === entry.id}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ExpenseLog;
