import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportsData } from '../types';
import { formatCurrency, formatDateTime } from '../utils';

interface ExpenseReportsProps {
  reports: ReportsData;
}

export const ExpenseReports: React.FC<ExpenseReportsProps> = ({ reports }) => {
  const totals = reports?.totals || { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
  const expenseVsSales = reports?.expense_vs_sales || null;

  return (
    <div className="space-y-6">
      {/* Grid of Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-sm font-semibold">Report Totals</CardTitle></CardHeader>
          <CardContent className="flex-1 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success/5 border border-success/20 p-3">
              <p className="text-[10px] font-bold text-success uppercase">Daily</p>
              <p className="mt-1 font-extrabold text-sm text-success">{formatCurrency(totals.daily)}</p>
            </div>
            <div className="rounded-xl bg-info/5 border border-info/20 p-3">
              <p className="text-[10px] font-bold text-info uppercase">Weekly</p>
              <p className="mt-1 font-extrabold text-sm text-info">{formatCurrency(totals.weekly)}</p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
              <p className="text-[10px] font-bold text-primary uppercase">Monthly</p>
              <p className="mt-1 font-extrabold text-sm text-primary">{formatCurrency(totals.monthly)}</p>
            </div>
            <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3">
              <p className="text-[10px] font-bold text-amber-700 uppercase">Yearly</p>
              <p className="mt-1 font-extrabold text-sm text-amber-950">{formatCurrency(totals.yearly)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-sm font-semibold">Category Spend</CardTitle></CardHeader>
          <CardContent className="flex-1 max-h-[220px] overflow-y-auto space-y-2 pr-1">
            {(reports.category_totals || []).length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium text-center py-8">No category totals available.</p>
            ) : (
              reports.category_totals.map((item: any) => (
                <div key={item.category_key} className="border rounded-xl p-3 flex items-center justify-between hover:bg-muted/10">
                  <div>
                    <p className="font-semibold text-xs text-foreground">{item.category}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.count} entries</p>
                  </div>
                  <p className="font-extrabold text-xs text-destructive">{formatCurrency(item.total)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-sm font-semibold">Top 5 Biggest Expenses</CardTitle></CardHeader>
          <CardContent className="flex-1 max-h-[220px] overflow-y-auto space-y-2 pr-1">
            {(reports.top_expenses || []).length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium text-center py-8">No expenses available.</p>
            ) : (
              reports.top_expenses.map((expense: any) => (
                <div key={expense.id} className="border rounded-xl p-3 flex items-center justify-between hover:bg-muted/10">
                  <div>
                    <p className="font-semibold text-xs text-foreground truncate max-w-[150px]">{expense.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{expense.category} · {expense.payment_method}</p>
                  </div>
                  <p className="font-extrabold text-xs text-destructive shrink-0">{formatCurrency(expense.amount || expense.total)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses vs Sales Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Expenses vs Sales Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="border rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Expenses</p>
              <p className="mt-1 font-extrabold text-base text-destructive">{formatCurrency(expenseVsSales?.total_expenses)}</p>
            </div>
            <div className="border rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Sales</p>
              <p className="mt-1 font-extrabold text-base text-success">{formatCurrency(expenseVsSales?.total_sales)}</p>
            </div>
            <div className="border rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Difference</p>
              <p className={`mt-1 font-extrabold text-base ${(expenseVsSales?.difference || 0) < 0 ? 'text-destructive' : 'text-success'}`}>
                {formatCurrency(expenseVsSales?.difference)}
              </p>
            </div>
            <div className="border rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Expense Ratio</p>
              <p className="mt-1 font-extrabold text-base text-foreground">{Number.parseFloat(String(expenseVsSales?.expense_ratio || 0)).toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-3 text-right">
            Comparison window: {expenseVsSales?.date_from ? formatDateTime(expenseVsSales.date_from) : '—'} to {expenseVsSales?.date_to ? formatDateTime(expenseVsSales.date_to) : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
export default ExpenseReports;
