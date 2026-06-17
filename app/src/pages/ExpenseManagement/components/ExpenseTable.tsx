import React from 'react';
import { DollarSign, Edit3, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import { Expense } from '../types';
import { formatCurrency, formatDateTime } from '../utils';

interface ExpenseTableProps {
  expenses: Expense[];
  deletingExpenseId: number | null;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  deletingExpenseId,
  onEdit,
  onDelete,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Expense Records</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Paid To</TableHead>
              <TableHead className="hidden sm:table-cell">Payment Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState icon={<DollarSign />} title="No ledger records" description="No expense entries found matching filters" />
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => {
                const items = Array.isArray(expense.items) ? expense.items : [];
                // Cashier batch entries have no title/category — surface their
                // line items so the admin view isn't blank.
                const isBatch = items.length > 0 && !expense.title;
                const itemSummary = items.map((it) => it?.item).filter(Boolean).join(', ');
                return (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="font-semibold text-sm">
                      {expense.title || (isBatch ? `${items.length} item${items.length > 1 ? 's' : ''}` : '—')}
                    </div>
                    {isBatch && itemSummary && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-sm line-clamp-2">{itemSummary}</p>
                    )}
                    {expense.notes && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-sm line-clamp-1">{expense.notes}</p>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="text-[10px]">{expense.category || (isBatch ? 'cashier' : '—')}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{expense.paid_to || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="info" className="text-[10px]">{expense.payment_method || '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">{formatCurrency(expense.amount || expense.total)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDateTime(expense.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(expense)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(expense)}
                        disabled={deletingExpenseId === expense.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
export default ExpenseTable;
