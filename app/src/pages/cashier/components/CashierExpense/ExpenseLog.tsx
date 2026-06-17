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
  id: string;
  created_at: string;
  total: number;
  items: Array<{ item: string; cost: number }>;
}

interface ExpenseLogProps {
  entries: ExpenseEntry[];
  grandTotal: number;
  onEdit: (entry: ExpenseEntry) => void;
  onDelete: (entry: ExpenseEntry) => void;
  deletingId: string | null;
}

const formatDate = (value: string) =>
  new Date(value || getApproximateServerIsoString()).toLocaleDateString();

const ItemList: React.FC<{ items: ExpenseEntry['items'] }> = ({ items }) => (
  <div className="space-y-1 text-sm">
    {(items || []).map((it, i) => (
      <div key={i} className="flex justify-between gap-4">
        <span className="truncate">{it.item}</span>
        <span className="text-muted-foreground whitespace-nowrap">
          {Number(it.cost || 0).toFixed(2)} Birr
        </span>
      </div>
    ))}
  </div>
);

const MAX_SUMMARY_ITEMS = 3;

// Compact one-line summary for the table: first few item names, comma-separated,
// with a "+N more" tail so long entries don't blow up the row height.
const ItemSummary: React.FC<{ items: ExpenseEntry['items'] }> = ({ items }) => {
  const names = (items || []).map((it) => it.item).filter(Boolean);
  const shown = names.slice(0, MAX_SUMMARY_ITEMS).join(', ');
  const rest = names.length - MAX_SUMMARY_ITEMS;
  return (
    <span className="block truncate text-sm" title={names.join(', ')}>
      {shown || '—'}
      {rest > 0 && <span className="text-muted-foreground"> +{rest} more</span>}
    </span>
  );
};

export const ExpenseLog: React.FC<ExpenseLogProps> = ({
  entries,
  grandTotal,
  onEdit,
  onDelete,
  deletingId,
}) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Receipt className="h-8 w-8 mb-2 opacity-40" />
        No expenses found for this period.
      </div>
    );
  }

  const Actions: React.FC<{ entry: ExpenseEntry }> = ({ entry }) => (
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
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
        <span className="font-semibold">Total: {grandTotal.toFixed(2)} Birr</span>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(entry.created_at)}
              </span>
              <Actions entry={entry} />
            </div>
            <ItemList items={entry.items} />
            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span>{Number(entry.total || 0).toFixed(2)} Birr</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-lg border sm:block">
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
                <TableCell className="text-sm text-muted-foreground align-top">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(entry.created_at)}
                  </div>
                </TableCell>
                <TableCell className="max-w-0 align-top">
                  <ItemSummary items={entry.items} />
                </TableCell>
                <TableCell className="text-right font-semibold align-top">
                  {Number(entry.total || 0).toFixed(2)} Birr
                </TableCell>
                <TableCell className="text-right align-top">
                  <Actions entry={entry} />
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
