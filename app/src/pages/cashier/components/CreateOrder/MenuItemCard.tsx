import React from 'react';
import { FiPlus } from 'react-icons/fi';

interface MenuItemCardProps {
  item: any;
  onAddToCart: (item: any) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToCart }) => {
  return (
    <div
      onClick={() => onAddToCart(item)}
      className="group relative flex min-h-[100px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-background p-4 text-center shadow-sm sm:min-h-[160px] sm:rounded-3xl"
    >

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
        <h3 className="text-base font-bold leading-tight text-foreground/90 line-clamp-2 sm:mb-3 sm:text-lg">
          {item.name}
        </h3>
      </div>

      <div className="relative z-10 mt-2 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-2xl border border-border bg-muted/50 px-3 py-1.5  transition-colors sm:px-3.5">
          <span className="text-sm font-extrabold  text-foreground sm:text-sm">
            {parseFloat(item.price).toFixed(2)} Birr
          </span>
        </div>
        
        <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground/60 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <FiPlus className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

// Memoized so the menu grid doesn't re-render every time the cart changes — with
// a stable `onAddToCart` and stable item objects, adding an item touches only the
// cart, not the grid (prevents the click-flicker).
export default React.memo(MenuItemCard);
