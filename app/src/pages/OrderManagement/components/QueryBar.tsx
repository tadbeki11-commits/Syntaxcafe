import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface QueryBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
  filterType: string;
  onTypeChange: (type: string) => void;
  userRole?: string;
  paidOrderIdSet: Set<string>;
  menuMainCategoryById: { [key: number]: string };
}

export const QueryBar: React.FC<QueryBarProps> = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterType,
  onTypeChange,
  userRole
}) => {
  const useDerivedStatus = userRole === 'admin';

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search Orders</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, table, or waiter..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {useDerivedStatus ? (
                <>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</Label>
          <Select value={filterType} onValueChange={onTypeChange}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {!useDerivedStatus && <SelectItem value="bakery">Bakery</SelectItem>}
              <SelectItem value="cafe">Café</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="barista">Barista</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
