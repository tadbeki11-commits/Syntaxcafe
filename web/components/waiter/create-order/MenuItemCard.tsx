/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Plus } from "lucide-react";

interface MenuItemCardProps {
  item: any;
  onAddToCart: (item: any) => void;
  // Inventory-derived stock hint for this item, or undefined when the owner
  // toggle is off / the item has no recipe. Items stay orderable regardless.
  availability?: { status: "out" | "low" | "in_stock"; makeable: number };
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onAddToCart,
  availability,
}) => {
  const isOut = availability?.status === "out";
  const isLow = availability?.status === "low";

  return (
    <div
      onClick={() => onAddToCart(item)}
      className="group relative flex min-h-23 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-background p-3 text-center shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md sm:min-h-40 sm:rounded-3xl sm:p-4"
    >
      {/* Tilted "Out of stock" ribbon. pointer-events-none keeps the card
          clickable — out-of-stock items stay orderable, this is just a hint. */}
      {isOut ? (
        <span className="pointer-events-none absolute left-1.5 top-2.5 z-20 -rotate-12 select-none rounded-md bg-linear-to-br from-red-500 to-red-600 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-md shadow-red-500/30 ring-1 ring-red-700/20 sm:text-[10px]">
          Out of stock
        </span>
      ) : isLow ? (
        <span className="pointer-events-none absolute left-2 top-2 z-20 select-none rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold leading-none text-amber-700 shadow-sm">
          {availability!.makeable} left
        </span>
      ) : null}

      <div
        className={`relative z-10 flex w-full flex-1 flex-col items-center justify-center transition-opacity ${
          isOut ? "opacity-60" : ""
        }`}
      >
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
