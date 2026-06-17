"use client";

import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/waiter/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useWaiterCreateOrder } from "@/components/waiter/create-order/useWaiterCreateOrder";
import OrderFiltersPanel from "@/components/waiter/create-order/OrderFiltersPanel";
import WaiterHeader from "@/components/waiter/create-order/WaiterHeader";
import WaiterCartSidebar from "@/components/waiter/create-order/WaiterCartSidebar";
import MobileCartDialog from "@/components/waiter/create-order/MobileCartDialog";
import MenuItemCard from "@/components/waiter/create-order/MenuItemCard";

export default function CreateOrderPage() {
  const router = useRouter();
  const {
    loading,
    filteredItems,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedMainCategory,
    setSelectedMainCategory,
    creatingOrder,
    selectedTable,
    setSelectedTable,
    orderItems,
    notes,
    setNotes,
    allTables,
    isMobileSummaryOpen,
    setIsMobileSummaryOpen,
    mappedMainCategories,
    mappedSubCategories,
    mainFilteredCount,
    isFastingCategory,
    addToOrder,
    removeFromOrder,
    updateQuantity,
    updateItemNote,
    calculateTotal,
    getOrderRoutingInfo,
    handleSubmitOrder,
    handleLogout,
    formatCurrency,
    forceTableSelection,
  } = useWaiterCreateOrder();

  if (loading) return <LoadingSpinner text="Loading menu register..." />;

  const totalItemsCount = mappedMainCategories.reduce(
    (sum, c) => sum + c.count,
    0,
  );
  const trimmedSearchQuery = searchQuery.trim();

  return (
    <div className="h-screen overflow-auto bg-[#fafaf9] font-sans selection:bg-amber-100 selection:text-amber-900 flex flex-col animate-in fade-in duration-300">
      {/* Premium Navigation Header */}
      <WaiterHeader
        onLogout={handleLogout}
        onNavigateToHistory={() => router.push("/waiter/order-history")}
        onNavigateToDashboard={() => router.push("/waiter")}
      />

      <div className="flex-1 max-w-full mx-auto px-4 sm:px-6 pb-5 flex flex-col lg:flex-row gap-6 overflow-auto w-full pt-2">
        <div className="flex-1 space-y-2 flex flex-col">
          <OrderFiltersPanel
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search menu items for this table..."
            allTables={allTables}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            selectedMainCategory={selectedMainCategory}
            onSelectMainCategory={(cat) => {
              setSelectedMainCategory(cat);
              setSelectedCategory("all");
            }}
            mainCategories={mappedMainCategories}
            totalItemsCount={totalItemsCount}
            selectedSubCategory={selectedCategory}
            onSelectSubCategory={setSelectedCategory}
            subCategories={mappedSubCategories}
            totalSubItemsCount={mainFilteredCount}
            showSubCategories={isFastingCategory(selectedMainCategory)}
            forceTableSelection={forceTableSelection}
          />

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 bg-background/90 shadow-sm shadow-amber-100/30">
            <div className="flex flex-col gap-3 border-b border-border/50 bg-linear-to-r from-white to-amber-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-bold text-foreground">
                    Menu items
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-700"
                  >
                    {filteredItems.length} items
                  </Badge>
                </div>
              </div>

              {trimmedSearchQuery ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="self-start border-border bg-background text-foreground/80 hover:bg-muted/30"
                >
                  Clear search
                </Button>
              ) : null}
            </div>

            <CardContent className="min-h-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 overflow-auto gap-2 p-2">
              {filteredItems.length === 0 ? (
                <div className="col-span-full flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-amber-100 to-orange-100 text-2xl shadow-sm">
                    🍽️
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {trimmedSearchQuery
                      ? "No matching items found"
                      : "No items found"}
                  </h3>
                  <p className="text-muted-foreground font-medium max-w-md">
                    {trimmedSearchQuery
                      ? "Try a different keyword or clear the search to see all available items."
                      : "Try selecting a different category to load items here."}
                  </p>
                </div>
              ) : (
                <>
                  {filteredItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToCart={addToOrder}
                    />
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:flex lg:flex-col lg:w-96 min-h-0">
          <WaiterCartSidebar
            orderItems={orderItems}
            selectedTable={selectedTable}
            creatingOrder={creatingOrder}
            onUpdateQuantity={updateQuantity}
            onRemoveFromOrder={removeFromOrder}
            onUpdateItemNote={updateItemNote}
            onSubmitOrder={handleSubmitOrder}
            calculateTotal={calculateTotal}
            getOrderRoutingInfo={getOrderRoutingInfo}
            formatCurrency={formatCurrency}
            forceTableSelection={forceTableSelection}
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>
      </div>

      <MobileCartDialog
        open={isMobileSummaryOpen}
        onOpenChange={setIsMobileSummaryOpen}
        orderItems={orderItems}
        selectedTable={selectedTable}
        creatingOrder={creatingOrder}
        onUpdateQuantity={updateQuantity}
        onRemoveFromOrder={removeFromOrder}
        onUpdateItemNote={updateItemNote}
        onSubmitOrder={handleSubmitOrder}
        calculateTotal={calculateTotal}
        getOrderRoutingInfo={getOrderRoutingInfo}
        formatCurrency={formatCurrency}
        forceTableSelection={forceTableSelection}
        notes={notes}
        onNotesChange={setNotes}
      />
    </div>
  );
}
