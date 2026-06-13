import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryTabsProps {
  selectedMainCategory: string;
  onSelectMainCategory: (cat: string) => void;
  mainCategories: { id: string; label: string; count: number }[];
  totalItemsCount: number;

  selectedSubCategory: string;
  onSelectSubCategory: (cat: string) => void;
  subCategories: { id: string; label: string; count: number }[];
  totalSubItemsCount: number;
  showSubCategories: boolean;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedMainCategory,
  onSelectMainCategory,
  mainCategories,
  totalItemsCount,
  selectedSubCategory,
  onSelectSubCategory,
  subCategories,
  totalSubItemsCount,
  showSubCategories
}) => {
  const selectedMainLabel =
    selectedMainCategory === 'all'
      ? `All Items (${totalItemsCount})`
      : `${mainCategories.find((c) => c.id === selectedMainCategory)?.label ?? 'Category'} (${mainCategories.find((c) => c.id === selectedMainCategory)?.count ?? 0})`;

  const selectedSubLabel =
    selectedSubCategory === 'all'
      ? `All Sub-items (${totalSubItemsCount})`
      : `${subCategories.find((c) => c.id === selectedSubCategory)?.label ?? 'Sub-category'} (${subCategories.find((c) => c.id === selectedSubCategory)?.count ?? 0})`;

  return (
    <Card className="mb-3 overflow-hidden border-border/80 bg-background/85 shadow-sm shadow-amber-100/20">
      <CardContent className="px-4 py-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-warning shadow-sm">
              <span className="text-sm font-black">C</span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Category</p>
              <h3 className="text-sm font-extrabold tracking-tight text-foreground">Filter menu items</h3>
            </div>
          </div>

          <Badge variant="outline" className="w-fit border-border bg-muted/30 px-2.5 py-0.5 text-[10px] text-muted-foreground">
            {showSubCategories ? 'Main + Sub' : 'Main only'}
          </Badge>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Main category
            </label>
            <Select value={selectedMainCategory} onValueChange={onSelectMainCategory}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-background px-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors focus:ring-amber-400/20">
                <SelectValue>{selectedMainLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items ({totalItemsCount})</SelectItem>
                {mainCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="capitalize">{c.label}</span>
                      <span className="text-xs text-muted-foreground">{c.count}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showSubCategories ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Sub category
              </label>
              <Select value={selectedSubCategory} onValueChange={onSelectSubCategory}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-background px-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors focus:ring-amber-400/20">
                  <SelectValue>{selectedSubLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-items ({totalSubItemsCount})</SelectItem>
                  {subCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex w-full items-center justify-between gap-4 capitalize">
                        <span>{c.label}</span>
                        <span className="text-xs text-muted-foreground">{c.count}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryTabs;
