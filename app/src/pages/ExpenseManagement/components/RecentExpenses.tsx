import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '../types';
import { formatCurrency, formatDateTime } from '../utils';

interface RecentExpensesProps {
  recentExpenses: Expense[];
}

export const RecentExpenses: React.FC<RecentExpensesProps> = ({ recentExpenses }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Clock className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-semibold">Recent Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {recentExpenses.length === 0 ? (
            <div className="text-center text-xs font-medium text-muted-foreground py-8 border border-dashed rounded-xl bg-muted/20">
              No recent expenses to display
            </div>
          ) : (
            recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 p-3 border rounded-xl hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{expense.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {expense.category} · {expense.payment_method} · {expense.paid_to || 'No payee'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-sm text-destructive">{formatCurrency(expense.amount || expense.total)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(expense.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export default RecentExpenses;
