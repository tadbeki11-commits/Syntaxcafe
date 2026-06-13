import React from 'react';
import { ToggleRight, ToggleLeft, Edit3, Trash2, ChefHat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MenuItem } from '../types';
import type { LocalRecipe } from '@/db/types';

interface MenuItemCardProps {
  item: MenuItem;
  isAdmin: boolean;
  normCat: (cat: string) => string;
  onToggleAvailability: (id: string) => void;
  onOpenEdit: (item: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  recipe?: LocalRecipe | null;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  isAdmin,
  normCat,
  onToggleAvailability,
  onOpenEdit,
  onDeleteItem,
  recipe,
}) => {
  const hasRecipe = Boolean(recipe);
  const ingredientCount = recipe?.ingredients?.length ?? 0;

  return (
    <Card className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm leading-tight truncate">{item.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {item.description || 'No description'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => onToggleAvailability(item.id)}
              className="shrink-0 mt-0.5"
            >
              {item.is_available ? (
                <ToggleRight className="h-6 w-6 text-success" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <Badge
            variant={normCat(item.category) === 'barista' ? 'info' : 'success'}
            className="text-[10px]"
          >
            {normCat(item.category)}
          </Badge>
          {(item.sub_category || item.category) && (
            <Badge variant="secondary" className="text-[10px]">
              {item.sub_category || item.category}
            </Badge>
          )}
          <Badge
            variant={item.is_available ? 'success' : 'destructive'}
            className="text-[10px] ml-auto"
          >
            {item.is_available ? 'Available' : 'Unavailable'}
          </Badge>

          {/* Recipe status badge (admin only) */}
          {isAdmin && (
            hasRecipe ? (
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/50 text-emerald-600 dark:text-emerald-400 gap-1"
                title={`Recipe: ${ingredientCount} ingredient(s)`}
              >
                <ChefHat className="h-2.5 w-2.5" />
                {ingredientCount} ing.
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] border-warning/50 text-warning dark:text-amber-400 gap-1"
                title="No recipe — stock won't auto-deduct"
              >
                <ChefHat className="h-2.5 w-2.5" />
                No recipe
              </Badge>
            )
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          <span className="font-bold text-lg">{parseInt(String(item.price), 10)} Birr</span>
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onOpenEdit(item)}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDeleteItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;
