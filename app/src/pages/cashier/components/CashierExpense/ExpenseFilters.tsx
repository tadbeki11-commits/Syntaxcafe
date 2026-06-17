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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:flex-none sm:w-44">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          placeholder="Search item..."
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={savedFilter} onValueChange={onSavedFilterChange}>
          <SelectTrigger className="w-full sm:w-36">
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
            <SelectTrigger className="w-full sm:w-36">
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
            className="w-full sm:w-40"
          />
        )}

        {savedFilter === 'custom' && customMode === 'range' && (
          <>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="w-full sm:w-40"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="w-full sm:w-40"
            />
          </>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Refresh"
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ExpenseFilters;
