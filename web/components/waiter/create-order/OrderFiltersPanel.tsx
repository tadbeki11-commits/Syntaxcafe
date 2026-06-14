"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useMemo, useState } from "react";
import { Search, X, MapPin, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderFiltersPanelProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  allTables: any[];
  selectedTable: string;
  onSelectTable: (table: string) => void;
  selectedMainCategory: string;
  onSelectMainCategory: (cat: string) => void;
  mainCategories: { id: string; label: string; count: number }[];
  totalItemsCount: number;
  selectedSubCategory: string;
  onSelectSubCategory: (cat: string) => void;
  subCategories: { id: string; label: string; count: number }[];
  totalSubItemsCount: number;
  showSubCategories: boolean;
  forceTableSelection?: boolean;
}

const OrderFiltersPanel: React.FC<OrderFiltersPanelProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search menu items, categories, or sub-items...",
  allTables,
  selectedTable,
  onSelectTable,
  selectedMainCategory,
  onSelectMainCategory,
  mainCategories,
  totalItemsCount,
  selectedSubCategory,
  onSelectSubCategory,
  subCategories,
  totalSubItemsCount,
  showSubCategories,
}) => {
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [mainCategoryMenuOpen, setMainCategoryMenuOpen] = useState(false);
  const [subCategoryMenuOpen, setSubCategoryMenuOpen] = useState(false);

  const mainCategoryOptions = useMemo(
    () => [
      { id: "all", label: "All categories", count: totalItemsCount },
      ...mainCategories,
    ],
    [mainCategories, totalItemsCount],
  );

  const subCategoryOptions = useMemo(
    () =>
      !showSubCategories
        ? []
        : [
            { id: "all", label: "All sub-items", count: totalSubItemsCount },
            ...subCategories,
          ],
    [showSubCategories, subCategories, totalSubItemsCount],
  );

  const clearSearch = () => onSearchChange("");

  const tableTriggerLabel =
    selectedTable === "takeaway"
      ? "Take Away"
      : selectedTable === "beu"
        ? "Beu"
        : selectedTable
          ? `Table #${selectedTable}`
          : "Select table";

  const handleSelectTable = (value: string) => {
    onSelectTable(value);
    setTableMenuOpen(false);
  };
  const handleSelectMainCategory = (value: string) => {
    onSelectMainCategory(value);
    setMainCategoryMenuOpen(false);
  };
  const handleSelectSubCategory = (value: string) => {
    onSelectSubCategory(value);
    setSubCategoryMenuOpen(false);
  };

  const selectedMainOption =
    mainCategoryOptions.find((c) => c.id === selectedMainCategory) ??
    mainCategoryOptions[0];
  const selectedSubOption =
    subCategoryOptions.find((c) => c.id === selectedSubCategory) ??
    subCategoryOptions[0];

  const formatTriggerLabel = (
    option: { label: string; count?: number } | undefined,
    fallback: string,
  ) => {
    if (!option) return fallback;
    const countSuffix =
      typeof option.count === "number" ? ` · ${option.count}` : "";
    return `${option.label}${countSuffix}`;
  };

  return (
    <Card className="shrink-0 border-border/80 bg-background/90 shadow-sm shadow-amber-100/20">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* ── Row 1: Table controls + Search ─────────────────────────── */}
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
            {/* Table selection area */}
            <div className="flex-1 rounded-2xl border border-border/80 bg-muted/40 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectTable(
                        selectedTable === "takeaway" ? "" : "takeaway",
                      )
                    }
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-xs font-bold transition-all duration-200 active:scale-95 ${
                      selectedTable === "takeaway"
                        ? "border-transparent bg-foreground/90 text-background shadow-md"
                        : "border-border bg-background text-foreground/80 hover:bg-muted/30"
                    }`}
                  >
                    Take Away
                    {selectedTable === "takeaway" && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectTable(selectedTable === "beu" ? "" : "beu")
                    }
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-xs font-bold transition-all duration-200 active:scale-95 ${
                      selectedTable === "beu"
                        ? "border-transparent bg-info text-info-foreground shadow-md"
                        : "border-border bg-background text-foreground/80 hover:bg-muted/30"
                    }`}
                  >
                    Beu
                    {selectedTable === "beu" && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info/80 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-info" />
                      </span>
                    )}
                  </button>
                </>
                {/* Table picker dropdown */}
                {allTables?.length > 0 && (
                  <DropdownMenu
                    open={tableMenuOpen}
                    onOpenChange={setTableMenuOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="group inline-flex h-9 min-w-[120px] items-center justify-between gap-2 rounded-full border border-border bg-background/90 px-3 text-xs font-semibold text-foreground/80 transition-all duration-200 hover:border-amber-200 hover:bg-amber-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 data-[state=open]:border-amber-300 data-[state=open]:bg-background data-[state=open]:shadow-sm"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-warning" />
                          <span className="truncate">{tableTriggerLabel}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                            {allTables.length}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-[calc(100vw-2rem)] max-w-xs sm:w-72 rounded-2xl border border-border/80 bg-background/95 p-0 shadow-xl"
                    >
                      <div className="px-4 pt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Dining tables
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          Tap a table number to assign it to this order.
                        </p>
                      </div>
                      {allTables.length ? (
                        <div className="mt-3 px-4 pb-4">
                          <ScrollArea className="max-h-56 overflow-auto">
                            <div className="grid grid-cols-4 gap-2">
                              {allTables.map((table) => {
                                const value = String(table.number);
                                const isSelected = selectedTable === value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => handleSelectTable(value)}
                                    className={`flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition-all duration-200 active:scale-95 ${
                                      isSelected
                                        ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                                        : "border-border bg-background text-foreground/80 hover:border-amber-200 hover:bg-amber-50 hover:text-foreground"
                                    }`}
                                  >
                                    {value}
                                  </button>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No tables available
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <button
                  type="button"
                  onClick={() => handleSelectTable("")}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/30 active:scale-95"
                >
                  Clear
                </button>

                {selectedTable ? (
                  <div className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="truncate max-w-[120px]">
                      {selectedTable === "takeaway"
                        ? "Take Away"
                        : selectedTable === "beu"
                          ? "Beu"
                          : `Table #${selectedTable}`}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Search bar */}
            <div className="relative w-full rounded-full border border-border bg-muted p-1.5 lg:w-72 xl:w-80 shrink-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 rounded-full border-none bg-background pl-10 pr-10 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-400"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground/80"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* ── Row 2: Category filters ──────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Main category dropdown */}
              <DropdownMenu
                open={mainCategoryMenuOpen}
                onOpenChange={setMainCategoryMenuOpen}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="group inline-flex h-9 flex-1 min-w-[160px] items-center justify-between rounded-full border border-border bg-background/90 px-4 text-xs font-semibold text-foreground/80 transition-all duration-200 hover:border-amber-200 hover:bg-amber-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 data-[state=open]:border-amber-300 data-[state=open]:bg-background data-[state=open]:shadow-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning shrink-0">
                        Main
                      </span>
                      <span className="truncate">
                        {formatTriggerLabel(
                          selectedMainOption,
                          "All categories",
                        )}
                      </span>
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-[22rem] rounded-2xl border border-border/80 bg-background/95 p-0 shadow-xl">
                  <div className="px-4 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Main categories
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Choose what to show in the menu list.
                    </p>
                  </div>
                  <div className="mt-3 px-4 pb-4">
                    <ScrollArea className="max-h-60 overflow-auto">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {mainCategoryOptions.map((category) => {
                          const isSelected =
                            selectedMainCategory === category.id;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() =>
                                handleSelectMainCategory(category.id)
                              }
                              className={`flex h-16 flex-col items-start justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all duration-200 active:scale-95 ${
                                isSelected
                                  ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                                  : "border-border bg-background text-foreground/80 hover:border-amber-200 hover:bg-amber-50 hover:text-foreground"
                              }`}
                            >
                              <span className="line-clamp-2 capitalize">
                                {category.label}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isSelected ? "bg-background/20 text-inherit" : "bg-muted text-muted-foreground"}`}
                              >
                                {category.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sub category dropdown (conditional) */}
              {showSubCategories ? (
                <DropdownMenu
                  open={subCategoryMenuOpen}
                  onOpenChange={setSubCategoryMenuOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="group inline-flex h-9 flex-1 min-w-[160px] items-center justify-between rounded-full border border-border bg-background/90 px-4 text-xs font-semibold text-foreground/80 transition-all duration-200 hover:border-amber-200 hover:bg-amber-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 data-[state=open]:border-amber-300 data-[state=open]:bg-background data-[state=open]:shadow-sm"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info shrink-0">
                          Sub
                        </span>
                        <span className="truncate">
                          {formatTriggerLabel(
                            selectedSubOption,
                            "All sub-items",
                          )}
                        </span>
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-sm sm:w-[22rem] rounded-2xl border border-border/80 bg-background/95 p-0 shadow-xl">
                    <div className="px-4 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Sub categories
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Further narrow the selection for fasting menus.
                      </p>
                    </div>
                    <div className="mt-3 px-4 pb-4">
                      <ScrollArea className="max-h-60 overflow-auto">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {subCategoryOptions.map((category) => {
                            const isSelected =
                              selectedSubCategory === category.id;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() =>
                                  handleSelectSubCategory(category.id)
                                }
                                className={`flex h-16 flex-col items-start justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all duration-200 active:scale-95 ${
                                  isSelected
                                    ? "border-info/30 bg-info text-info-foreground shadow-sm"
                                    : "border-border bg-background text-foreground/80 hover:border-info/30 hover:bg-info/10 hover:text-foreground"
                                }`}
                              >
                                <span className="line-clamp-2 capitalize">
                                  {category.label}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isSelected ? "bg-background/20 text-inherit" : "bg-muted text-muted-foreground"}`}
                                >
                                  {category.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {/* Reset filters */}
              <button
                type="button"
                onClick={() => {
                  handleSelectMainCategory("all");
                  if (showSubCategories) handleSelectSubCategory("all");
                }}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/30 active:scale-95 shrink-0"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderFiltersPanel;
