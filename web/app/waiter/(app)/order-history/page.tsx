"use client";

import React from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/waiter/LoadingSpinner";
import {
  Clipboard,
  Search,
  Calendar,
  X,
  TrendingUp,
  MapPin,
  ClipboardCheck,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useWaiterOrderHistory } from "@/components/waiter/order-history/useWaiterOrderHistory";
import OrderHistoryHeader from "@/components/waiter/order-history/OrderHistoryHeader";
import OrderCard from "@/components/waiter/order-history/OrderCard";

export default function OrderHistoryPage() {
  const router = useRouter();
  const {
    loading,
    orders,
    filteredOrders,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    historyStats,
    addingItemsOrderId,
    addingItems,
    menuItems,
    getEffectiveStatus,
    getStatusDisplay,
    formatDate,
    canAddItems,
    startAddingItems,
    cancelAddingItems,
    addMenuItemToOrder,
    updateAddingItemQuantity,
    removeAddingItem,
    saveAddedItems,
    handleLogout,
    formatCurrency,
  } = useWaiterOrderHistory();

  if (loading) {
    return <LoadingSpinner text="Loading orders history..." />;
  }

  const setTodayPreset = () => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
  };

  const clearFilters = () => {
    setSelectedDate("");
    setSearchQuery("");
  };

  const isFiltered = selectedDate || searchQuery;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8 selection:bg-amber-100 selection:text-amber-900 animate-in fade-in duration-300">
      {/* Premium Header Banner */}
      <OrderHistoryHeader
        totalOrdersCount={orders.length}
        onNewOrder={() => router.push("/waiter/create-order")}
        onLogout={handleLogout}
      />

      {/* Modern Interactive KPI Statistics Bar */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-3xl group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-info/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-info/10 text-info p-3.5 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Active Search Orders
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-foreground">
                    {historyStats.ordersCount}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    tickets
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-3xl group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-emerald-500/10 text-emerald-600 p-3.5 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <TrendingUp className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Estimated Sales
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-emerald-600">
                    {formatCurrency(historyStats.revenue)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-3xl group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-warning/10 text-warning p-3.5 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Active Placements
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-foreground">
                    {historyStats.activeTablesCount}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    tables
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Premium Date & Query Search Filter Bar */}
      {orders.length > 0 && (
        <Card className="border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-3xl bg-gradient-to-r from-white/80 via-white/95 to-white/70 backdrop-blur-md overflow-hidden">
          <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Indicators and Headers */}
            <div className="flex items-center justify-between lg:justify-start gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary p-2 rounded-xl">
                  <Filter className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-black text-foreground uppercase tracking-wider block">
                    Live Filters
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground/80 block mt-0.5">
                    Narrow down historical records
                  </span>
                </div>
              </div>
              {isFiltered && (
                <span className="lg:hidden bg-primary/10 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>

            {/* Dynamic input blocks */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 justify-end">
              {/* Search text query */}
              <div className="relative flex-1 max-w-sm group">
                <Search className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search order ID or table number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-9 text-xs font-bold rounded-2xl border border-border/80 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/80 transition-all placeholder:text-muted-foreground/50 shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date selector input */}
              <div className="relative shrink-0 group">
                <Calendar className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-primary transition-colors" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-11 pl-10 pr-9 text-xs font-bold rounded-2xl border border-border/80 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/80 transition-all text-foreground shadow-inner"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Presets and Reset Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 text-[11px] font-black px-4 rounded-2xl hover:bg-primary/5 transition-colors border-border/80 bg-background"
                  onClick={setTodayPreset}
                >
                  Today
                </Button>

                {isFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 text-[11px] font-black text-destructive hover:bg-destructive/5 px-3 rounded-2xl transition-colors gap-1"
                    onClick={clearFilters}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders History Grid */}
      {orders.length === 0 ? (
        <div className="text-center py-24 bg-background/50 backdrop-blur-sm rounded-[32px] border border-dashed border-border/80 max-w-lg mx-auto p-6 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-sm animate-bounce">
            <Clipboard className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-2">
            No orders recorded yet
          </h3>
          <p className="text-muted-foreground font-semibold text-xs max-w-sm mx-auto mb-8 leading-relaxed">
            No history transactions are loaded yet. Tap checkout below to launch
            a new cafe/table order.
          </p>
          <button
            onClick={() => router.push("/waiter/create-order")}
            className="px-8 py-4 bg-primary hover:bg-primary/95 text-primary-foreground font-black rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 text-xs tracking-wider uppercase"
          >
            Create First Order
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-background/50 backdrop-blur-sm rounded-[32px] border border-dashed border-border/80 max-w-md mx-auto p-6 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-5 border border-border/80">
            <span className="text-2xl animate-spin">🔍</span>
          </div>
          <h3 className="text-lg font-black text-foreground mb-2">
            No matching orders
          </h3>
          <p className="text-muted-foreground text-xs font-semibold max-w-xs mx-auto mb-6 leading-relaxed">
            Try adjusting your search query or clear the date filter parameter to
            discover history.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-10 text-xs font-black rounded-xl border-border/80 hover:bg-primary/5 transition-colors"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 animate-in slide-in-from-bottom-4 duration-500">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              addingItemsOrderId={addingItemsOrderId}
              addingItems={addingItems}
              menuItems={menuItems}
              getEffectiveStatus={getEffectiveStatus}
              getStatusDisplay={getStatusDisplay}
              formatDate={formatDate}
              canAddItems={canAddItems}
              startAddingItems={startAddingItems}
              cancelAddingItems={cancelAddingItems}
              addMenuItemToOrder={addMenuItemToOrder}
              updateAddingItemQuantity={updateAddingItemQuantity}
              removeAddingItem={removeAddingItem}
              saveAddedItems={saveAddedItems}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
}
