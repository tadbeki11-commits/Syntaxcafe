import React from 'react';
import { Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExpenseFilters as ExpenseFiltersType } from '../types';

interface ExpenseFiltersProps {
  filters: ExpenseFiltersType;
  categories: string[];
  paymentMethods: string[];
  onFilterChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onApplyFilters: (event: React.FormEvent) => void;
  onResetFilters: () => void;
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  filters,
  categories,
  paymentMethods,
  onFilterChange,
  onCategoryChange,
  onPaymentMethodChange,
  onApplyFilters,
  onResetFilters,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onResetFilters} className="text-xs">
          Reset filters
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={onApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Search</Label>
            <Input
              name="search"
              value={filters.search}
              onChange={onFilterChange}
              placeholder="Search title, payee, or notes..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={filters.category} onValueChange={onCategoryChange}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_cats">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={filters.payment_method} onValueChange={onPaymentMethodChange}>
              <SelectTrigger><SelectValue placeholder="All Methods" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_methods">All Methods</SelectItem>
                {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From Date</Label>
            <Input name="dateFrom" type="date" value={filters.dateFrom} onChange={onFilterChange} />
          </div>
          <div className="space-y-1.5">
            <Label>To Date</Label>
            <Input name="dateTo" type="date" value={filters.dateTo} onChange={onFilterChange} />
          </div>
          <div className="space-y-1.5">
            <Label>Min Amount</Label>
            <Input
              name="minAmount"
              type="number"
              min="0"
              step="0.01"
              value={filters.minAmount}
              onChange={onFilterChange}
              placeholder="Min Birr"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Amount</Label>
            <Input
              name="maxAmount"
              type="number"
              min="0"
              step="0.01"
              value={filters.maxAmount}
              onChange={onFilterChange}
              placeholder="Max Birr"
            />
          </div>
          <Button type="submit" className="sm:col-span-2 md:col-span-4 mt-2">
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
export default ExpenseFilters;
