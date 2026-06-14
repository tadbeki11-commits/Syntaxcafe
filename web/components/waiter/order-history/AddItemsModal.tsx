"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { formatOrderNumber } from "@/lib/utils";
import React, { useState, useMemo } from "react";
import {
  Plus,
  Minus,
  X,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AddItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  addingItems: any[];
  menuItems: any[];
  addMenuItemToOrder: (item: any) => void;
  updateAddingItemQuantity: (index: number, newQty: number) => void;
  removeAddingItem: (index: number) => void;
  saveAddedItems: () => Promise<void>;
  formatCurrency: (val: any) => string;
}

export const AddItemsModal: React.FC<AddItemsModalProps> = ({
  isOpen,
  onClose,
  order,
  addingItems,
  menuItems,
  addMenuItemToOrder,
  updateAddingItemQuantity,
  removeAddingItem,
  saveAddedItems,
  formatCurrency,
}) => {
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredCatalog = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.is_available) return false;
      if (activeCategory !== "all") {
        const mainCat = String(item.main_category || "").toLowerCase();
        if (mainCat !== activeCategory) return false;
      }
      if (catalogSearch) {
        const query = catalogSearch.toLowerCase();
        const matchesName = String(item.name || "")
          .toLowerCase()
          .includes(query);
        const matchesCategory = String(item.category || item.sub_category || "")
          .toLowerCase()
          .includes(query);
        if (!matchesName && !matchesCategory) return false;
      }
      return true;
    });
  }, [menuItems, catalogSearch, activeCategory]);

  const categories = useMemo(() => {
    const list = new Set<string>();
    menuItems.forEach((item) => {
      if (item.is_available && item.main_category) {
        list.add(String(item.main_category).toLowerCase());
      }
    });
    return ["all", ...Array.from(list)];
  }, [menuItems]);

  const additionSubtotal = addingItems.reduce(
    (sum, item) => sum + (parseFloat(item.subtotal) || 0),
    0,
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl rounded-[32px] overflow-hidden p-6 gap-6 bg-gradient-to-b from-background via-background to-background/98 shadow-2xl border-white/20">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary p-2.5 rounded-2xl">
              <ShoppingBag className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
                Modify Order {formatOrderNumber(order)}
                <Badge
                  variant="secondary"
                  className="text-[9px] font-black tracking-widest bg-primary/10 text-primary"
                >
                  ACTIVE CHECKS
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground/80 mt-0.5">
                Modify table checkout, takeaway, or beu tickets dynamically by
                selecting catalog items.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-2">
          {/* Left Column: Menu Items Catalog (Span 7) */}
          <div className="md:col-span-7 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Cafe Menu Catalog
              </h5>
              <span className="text-[9px] font-black text-primary/80 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary animate-spin" />
                {filteredCatalog.length} Items Available
              </span>
            </div>

            {/* Catalog Search & Category Filter Pills */}
            <div className="space-y-2.5">
              <div className="relative group">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search menu catalog..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 text-xs font-bold rounded-xl border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/60 transition-all placeholder:text-muted-foreground/50 shadow-inner"
                />
                {catalogSearch && (
                  <button
                    onClick={() => setCatalogSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all shrink-0 ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Catalog Selector list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-xs text-muted-foreground/80 font-bold bg-background/50 rounded-2xl border border-dashed">
                  No matching menu items found.
                </div>
              ) : (
                filteredCatalog.map((menuItem) => (
                  <Button
                    key={menuItem.id}
                    variant="outline"
                    className="h-auto justify-between text-left p-3 rounded-2xl border border-border/60 items-center flex hover:bg-primary/5 active:scale-[0.98] transition-all bg-background shadow-sm hover:border-primary/20"
                    onClick={() => addMenuItemToOrder(menuItem)}
                  >
                    <div className="min-w-0 flex-1 truncate pr-2">
                      <p className="font-extrabold text-xs text-foreground truncate">
                        {menuItem.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5 tracking-wider">
                        {menuItem.main_category || "unit"}
                        {menuItem.sub_category || menuItem.category
                          ? ` • ${menuItem.sub_category || menuItem.category}`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-black border bg-muted/60 shrink-0"
                    >
                      {formatCurrency(menuItem.price)}
                    </Badge>
                  </Button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Slated Additions (Span 5) */}
          <div className="md:col-span-5 flex flex-col gap-3.5 border-t md:border-t-0 md:border-l pt-5 md:pt-0 md:pl-5">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Slated Additions
              </h5>
              <Badge
                variant="secondary"
                className="text-[10px] font-black bg-primary/10 text-primary"
              >
                {addingItems.length} Products Added
              </Badge>
            </div>

            {addingItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-2xl bg-muted/10 min-h-[220px]">
                <span className="text-3xl mb-2 animate-bounce">🛒</span>
                <p className="text-xs font-bold text-muted-foreground">
                  No additions slated yet
                </p>
                <p className="text-[10px] text-muted-foreground/70 max-w-[160px] mt-1 mx-auto leading-relaxed">
                  Tap any product card in the menu catalog on the left to add it
                  here.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between gap-4">
                {/* Cart scroll list */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 flex-1">
                  {addingItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-background border border-border/70 p-3 rounded-2xl text-xs shadow-sm hover:shadow transition-all duration-300"
                    >
                      <div className="min-w-0 flex-1 truncate pr-2">
                        <p className="font-extrabold text-foreground truncate">
                          {item.menu_item_name}
                        </p>
                        <p className="text-[9px] text-muted-foreground/80 font-bold mt-0.5">
                          {formatCurrency(item.unit_price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-lg hover:border-primary/25 bg-background shadow-sm"
                          onClick={() =>
                            updateAddingItemQuantity(idx, item.quantity - 1)
                          }
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-4 text-center font-black text-xs text-foreground">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-lg hover:border-primary/25 bg-background shadow-sm"
                          onClick={() =>
                            updateAddingItemQuantity(idx, item.quantity + 1)
                          }
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg ml-1"
                          onClick={() => removeAddingItem(idx)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal banner */}
                <div className="bg-emerald-500/5 border border-emerald-200/30 p-3 rounded-2xl shadow-inner mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-muted-foreground flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                      Addition Subtotal:
                    </span>
                    <span className="font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                      {formatCurrency(additionSubtotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex gap-2 w-full justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs font-bold gap-1.5 rounded-xl border-border/80 bg-background shadow-sm hover:bg-muted"
              onClick={onClose}
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              className="h-10 text-xs font-black gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow transition-all duration-200 active:scale-95"
              onClick={saveAddedItems}
              disabled={addingItems.length === 0}
            >
              <Save className="w-3.5 h-3.5 text-primary-foreground" /> Save
              Additions
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemsModal;
