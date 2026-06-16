/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Plus } from "lucide-react";

interface MenuItemCardProps {
  item: any;
  onAddToCart: (item: any) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToCart }) => {
  return (
    <div
      onClick={() => onAddToCart(item)}
      className="group relative flex min-h-23 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-background p-3 text-center shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md sm:min-h-40 sm:rounded-3xl sm:p-4"
    >
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
        <h3 className="text-sm font-bold leading-tight text-foreground/90 line-clamp-2 sm:mb-3 sm:text-lg">
          {item.name}
        </h3>
      </div>

      <div className="relative z-10 mt-2 flex w-full items-center justify-between gap-2">
        <div className="min-w-0 flex-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 transition-colors sm:rounded-2xl sm:px-3.5 sm:py-1.5">
          <span className="block truncate text-xs font-extrabold text-foreground sm:text-sm">
            {parseFloat(item.price).toFixed(2)} Birr
          </span>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/60 transition-all duration-300 group-hover:rotate-90 group-hover:bg-primary group-hover:text-primary-foreground sm:h-8 sm:w-8">
          <Plus className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
