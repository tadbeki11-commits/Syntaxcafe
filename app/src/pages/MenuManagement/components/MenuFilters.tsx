import React from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MenuFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  isFastingType: boolean;
  availableCategories: string[];
  fastingSubCategories: string[];
  totalItemsCount: number;
  availableItemsCount: number;
  currentPage: number;
  totalPages: number;
}

export const MenuFilters: React.FC<MenuFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterCategory,
  setFilterCategory,
  isFastingType,
  availableCategories,
  fastingSubCategories,
  totalItemsCount,
  availableItemsCount,
  currentPage,
  totalPages,
}) => {
  const formatCategoryLabel = (category: string) => {
    const normalized = String(category || '').trim().toLowerCase();
    if (normalized === 'cafe') return 'Cafe';
    if (normalized === 'barista') return 'Barista';
    if (normalized === 'fasting') return 'የጾም ምግብ';
    if (normalized === 'fasting_break') return 'የፍስክ ምግብ';
    return normalized.replace(/_/g, ' ');
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search menu items..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-9" 
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {formatCategoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={filterCategory} 
            onValueChange={setFilterCategory} 
            disabled={!isFastingType}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Sub Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub Categories</SelectItem>
              {fastingSubCategories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap gap-2">
            <span>{totalItemsCount} items</span>
            <span>·</span>
            <span>{availableItemsCount} available</span>
            {totalPages > 1 && (
              <>
                <span>·</span>
                <span>Page {currentPage} of {totalPages}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuFilters;
