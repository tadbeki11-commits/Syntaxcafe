import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, Utensils, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import MenuItemCard from './MenuItemCard';
import { MenuItem } from '../types';
import type { LocalRecipe } from '@/db/types';

interface MenuItemGridProps {
  loading: boolean;
  filteredItems: MenuItem[];
  paginatedItems: MenuItem[];
  isAdmin: boolean;
  normCat: (cat: string) => string;
  onToggleAvailability: (id: string) => void;
  onOpenEdit: (item: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  onOpenAdd: () => void;
  recipesMap?: Record<string, LocalRecipe>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}

export const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  loading,
  filteredItems,
  paginatedItems,
  isAdmin,
  normCat,
  onToggleAvailability,
  onOpenEdit,
  onDeleteItem,
  onOpenAdd,
  recipesMap = {},
  currentPage,
  setCurrentPage,
  totalPages,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (filteredItems.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<Utensils />}
        title="No items found"
        description="Try adjusting your search or filter criteria"
        action={
          isAdmin ? (
            <Button onClick={onOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedItems.map(item => (
          <MenuItemCard
            key={item.id}
            item={item}
            isAdmin={isAdmin}
            normCat={normCat}
            onToggleAvailability={onToggleAvailability}
            onOpenEdit={onOpenEdit}
            onDeleteItem={onDeleteItem}
            recipe={recipesMap[item.id] ?? null}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
};

export default MenuItemGrid;
