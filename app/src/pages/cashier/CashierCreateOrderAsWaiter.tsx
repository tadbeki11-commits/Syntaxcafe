import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Hooks
import { useCashierCreateOrder } from './hooks/useCashierCreateOrder';

// Components
import CreateOrderHeader from './components/CreateOrder/CreateOrderHeader';
import OrderFiltersPanel from './components/CreateOrder/OrderFiltersPanel';
import WaiterCartSidebar from '../waiter/components/CreateOrder/WaiterCartSidebar';
import MobileCartDialog from '../waiter/components/CreateOrder/MobileCartDialog';
import MenuItemCard from './components/CreateOrder/MenuItemCard';

const CashierCreateOrderAsWaiter = () => {
  const navigate = useNavigate();
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = React.useState(false);
  const formatCurrency = React.useCallback((val: any) => {
    const n = parseFloat(val);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toLocaleString()} Birr`;
  }, []);
  const getOrderRoutingInfo = React.useCallback(() => null, []);
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
    isOnline,
    waiterName,
    mappedMainCategories,
    mappedSubCategories,
    mainFilteredCount,
    isFastingCategory,
    addToOrder,
    removeFromOrder,
    updateQuantity,
    updateItemNote,
    calculateTotal,
    handleSubmitOrder,
    forceTableSelection,
  } = useCashierCreateOrder();

  const totalItemsCount = mappedMainCategories.reduce((sum, c) => sum + c.count, 0);
  const trimmedSearchQuery = searchQuery.trim();

  if (loading) return <LoadingSpinner text="Loading menu..." />;

  return (
    <div className="h-screen overflow-hidden bg-background font-sans selection:bg-accent selection:text-accent-foreground flex flex-col animate-in fade-in duration-300">
      <CreateOrderHeader
        waiterName={waiterName}
        isOnline={isOnline}
        onNavigateToWaiters={() => navigate('/dashboard/cashier/select-waiter')}
        onNavigateToDashboard={() => navigate('/dashboard')}
      />

     

      <div className="flex-1 min-h-0 max-w-full mx-auto px-4 sm:px-6 pb-5 flex flex-col lg:flex-row gap-6 overflow-hidden w-full">
        <div className="flex-1 min-h-0 space-y-2 flex flex-col">
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
              setSelectedCategory('all');
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

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 bg-card/90 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-bold text-foreground">Menu items</h3>
                  <Badge variant="outline" className="border-border bg-accent text-accent-foreground">
                    {filteredItems.length} items
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trimmedSearchQuery
                    ? `Showing matches for “${trimmedSearchQuery}”.`
                    : 'Tap Add on any row to include the item in this order.'}
                </p>
              </div>

              {trimmedSearchQuery ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="self-start border-border bg-background text-foreground/80 hover:bg-muted/40"
                >
                  Clear search
                </Button>
              ) : null}
            </div>

            <CardContent className="min-h-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 overflow-auto gap-2 p-2">
              {filteredItems.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl shadow-sm">
                    🍽️
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {trimmedSearchQuery ? 'No matching items found' : 'No items found'}
                  </h3>
                  <p className="text-muted-foreground font-medium max-w-md">
                    {trimmedSearchQuery
                      ? 'Try a different keyword or clear the search to see all available items.'
                      : 'Try selecting a different category to load items here.'}
                  </p>
                </div>
              ) : (
                  <>
                  {
                    filteredItems.map((item) => (
                      <MenuItemCard key={item.id} item={item} onAddToCart={addToOrder} />
                    ))
                  }
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
};

export default CashierCreateOrderAsWaiter;
