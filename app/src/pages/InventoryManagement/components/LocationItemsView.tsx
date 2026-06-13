import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Warehouse, Coffee, ChefHat, MapPin, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { StockLocation } from '../types';
import { FormattedQuantity } from '../hooks/useQuantityFormatter';
import ItemsTable from './ItemsTable';
import InventoryFilters from './InventoryFilters';
import EmptyState from '@/components/common/EmptyState';
import { NormalizedInventoryItem } from '../types';

interface LocationItemsViewProps {
  selectedLocation: StockLocation | null;
  selectedLocationId: number | null;
  showOnlyInStock: boolean;
  setShowOnlyInStock: (show: boolean) => void;
  filteredLocationItems: NormalizedInventoryItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loading: boolean;
  formatQuantity: (qty: number, piecesPerUnit: number, purchaseUnit: string, baseUnit: string) => FormattedQuantity;
  onBack: () => void;
  onUpdateQty: (item: NormalizedInventoryItem) => void;
  onHistory: (item: NormalizedInventoryItem) => void;
  onEdit: (item: NormalizedInventoryItem) => void;
  onDelete: (item: NormalizedInventoryItem) => void;
  onPrint: () => void;
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

const getLocationIcon = (name: string, slug: string) => {
  const term = `${name} ${slug}`.toLowerCase();
  if (term.includes('store') || term.includes('warehouse') || term.includes('storage') || term.includes('main')) {
    return <Warehouse className="h-5 w-5 text-primary" />;
  }
  if (term.includes('barista') || term.includes('bar') || term.includes('coffee') || term.includes('cafe')) {
    return <Coffee className="h-5 w-5 text-amber-500" />;
  }
  if (term.includes('kitchen') || term.includes('chef') || term.includes('food')) {
    return <ChefHat className="h-5 w-5 text-emerald-500" />;
  }
  return <MapPin className="h-5 w-5 text-blue-500" />;
};

export const LocationItemsView: React.FC<LocationItemsViewProps> = ({
  selectedLocation,
  selectedLocationId,
  showOnlyInStock,
  setShowOnlyInStock,
  filteredLocationItems,
  searchTerm,
  setSearchTerm,
  loading,
  formatQuantity,
  onBack,
  onUpdateQty,
  onHistory,
  onEdit,
  onDelete,
  onPrint,
  page,
  limit,
  totalCount,
  totalPages,
  setPage,
  setLimit
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/40 p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="h-9 px-3 bg-background hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-background border shadow-xs">
              {getLocationIcon(selectedLocation?.name || '', selectedLocation?.slug || '')}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{selectedLocation?.name}</h3>
              <p className="text-xs text-muted-foreground">Showing items available inside this location.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer bg-background px-3 py-2 rounded-md border shadow-sm hover:bg-muted/50 transition-colors">
            <input 
              type="checkbox" 
              checked={showOnlyInStock} 
              onChange={e => setShowOnlyInStock(e.target.checked)} 
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5" 
            />
            <span>Show Only In Stock</span>
          </label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPrint}
            className="h-9 px-3 bg-background hover:bg-muted"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Inventory
          </Button>
        </div>
      </div>

      <InventoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <Card className="shadow-xs overflow-hidden border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : filteredLocationItems.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<div className="h-10 w-10 text-muted-foreground" />}
                title="No items available"
                description={showOnlyInStock ? "No items are currently in stock at this location." : "No items match your search for this location."}
              />
            </div>
          ) : (
            <>
              <ItemsTable
                items={filteredLocationItems}
                selectedLocationId={selectedLocationId}
                selectedLocationDefault={selectedLocation?.is_default ?? false}
                formatQuantity={formatQuantity}
                onUpdateQty={onUpdateQty}
                onHistory={onHistory}
                onEdit={onEdit}
                onDelete={onDelete}
              />
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                <div className="text-xs text-muted-foreground">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} items
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                    <SelectTrigger className="h-8 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationItemsView;
