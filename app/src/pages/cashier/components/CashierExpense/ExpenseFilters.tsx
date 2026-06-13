import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExpenseFiltersProps {
  savedFilter: string;
  onSavedFilterChange: (value: string) => void;
  customMode: string;
  onCustomModeChange: (value: string) => void;
  customDate: string;
  onCustomDateChange: (value: string) => void;
  customFrom: string;
  onCustomFromChange: (value: string) => void;
  customTo: string;
  onCustomToChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  savedFilter,
  onSavedFilterChange,
  customMode,
  onCustomModeChange,
  customDate,
  onCustomDateChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  search,
  onSearchChange,
  onRefresh,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          placeholder="Search item..."
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-44 pl-8"
        />
      </div>

      <Select value={savedFilter} onValueChange={onSavedFilterChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {savedFilter === 'custom' && (
        <Select value={customMode} onValueChange={onCustomModeChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="specific">Specific date</SelectItem>
            <SelectItem value="range">Date range</SelectItem>
          </SelectContent>
        </Select>
      )}

      {savedFilter === 'custom' && customMode === 'specific' && (
        <Input
          type="date"
          value={customDate}
          onChange={(e) => onCustomDateChange(e.target.value)}
          className="w-40"
        />
      )}

      {savedFilter === 'custom' && customMode === 'range' && (
        <>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="w-40"
          />
        </>
      )}

      <Button type="button" variant="outline" size="icon" onClick={onRefresh} title="Refresh">
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ExpenseFilters;
