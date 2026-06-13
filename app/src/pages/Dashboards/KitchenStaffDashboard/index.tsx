import React from 'react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';

// Hooks
import { useKitchenData } from './hooks/useKitchenData';
import { useKitchenAttendance } from './hooks/useKitchenAttendance';
import { useKitchenEditing } from './hooks/useKitchenEditing';
import { useKitchenOrders } from './hooks/useKitchenOrders';

// Components
import { HeaderBanner } from './components/HeaderBanner';
import { StatsCardsGrid } from './components/StatsCardsGrid';
import { IncomingOrdersPanel } from './components/IncomingOrdersPanel';
import { PreparingOrdersPanel } from './components/PreparingOrdersPanel';
import { ReadyOrdersPanel } from './components/ReadyOrdersPanel';
import { BackOfHouseUtilities } from './components/BackOfHouseUtilities';

const KitchenStaffDashboard = () => {
  const { user } = useAuth() as any;

  // Data fetching
  const {
    loading,
    dashboardData,
    setDashboardData,
    menuItems,
    filterPreparingOrdersForKitchen,
    filterMenuItemsForKitchen
  } = useKitchenData(user?.id);

  // Attendance management
  const {
    attendanceStatus,
    handleClockIn,
    handleClockOut
  } = useKitchenAttendance(user?.id);

  // Refresh function for both data fetching hooks
  const refreshDashboardData = async () => {
    // Re-fetch kitchen data by refetching orders
    try {
      const response = await fetch('/api/orders/all?type=cafe');
      if (response.ok) {
        // Data will be fetched by useKitchenData effect
        // For now, we rely on the effect to handle refetching
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  };

  // Order editing logic
  const {
    editingOrderId,
    editingItems,
    startEditingOrder,
    cancelEditing,
    updateItemQuantity,
    removeItem,
    addMenuItem,
    saveOrderChanges,
    addingItemsOrderId,
    addingItems,
    startAddingItems,
    cancelAddingItems,
    addMenuItemToPreparing,
    updateAddingItemQuantity,
    removeAddingItem,
    saveAddedItems
  } = useKitchenEditing(refreshDashboardData);

  // Order operations
  const {
    formatCurrency,
    startPreparing,
    markOrderReady
  } = useKitchenOrders(refreshDashboardData);

  // Attendance handlers
  const handleClockInClick = async () => {
    if (await handleClockIn()) {
      toast.success('Clocked in successfully!');
    } else {
      toast.error('Failed to clock in');
    }
  };

  const handleClockOutClick = async () => {
    if (await handleClockOut()) {
      toast.success('Clocked out successfully!');
    } else {
      toast.error('Failed to clock out');
    }
  };

  // Order editing handlers
  const handleSaveOrderChanges = async () => {
    if (await saveOrderChanges(editingOrderId, user?.id)) {
      // Success already handled in hook
    }
  };

  const handleSaveAddedItems = async () => {
    if (await saveAddedItems(addingItemsOrderId, user?.id)) {
      // Success already handled in hook
    }
  };

  // Order operation handlers
  const handleStartPreparing = async (orderId: any) => {
    if (await startPreparing(orderId, user?.id)) {
      // Success already handled in hook
    }
  };

  const handleMarkOrderReady = async (orderId: any) => {
    if (await markOrderReady(orderId, user?.id)) {
      // Success already handled in hook
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const filteredMenuItems = filterMenuItemsForKitchen(menuItems);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header with attendance */}
      <HeaderBanner
        attendanceStatus={attendanceStatus}
        onClockIn={handleClockInClick}
        onClockOut={handleClockOutClick}
      />

      {/* Statistics dashboard */}
      <StatsCardsGrid todayStats={dashboardData.todayStats} />

      {/* Board Column queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incoming Orders */}
        <IncomingOrdersPanel
          orders={dashboardData.kitchenOrders}
          loading={loading}
          editingOrderId={editingOrderId}
          editingItems={editingItems}
          menuItems={filteredMenuItems}
          formatCurrency={formatCurrency}
          onStartEditing={startEditingOrder}
          onCancelEditing={cancelEditing}
          onUpdateItemQuantity={updateItemQuantity}
          onRemoveItem={removeItem}
          onAddMenuItem={addMenuItem}
          onSaveChanges={handleSaveOrderChanges}
          onStartPreparing={handleStartPreparing}
        />

        {/* Preparing Orders */}
        <PreparingOrdersPanel
          orders={dashboardData.preparingOrders}
          loading={loading}
          addingItemsOrderId={addingItemsOrderId}
          addingItems={addingItems}
          menuItems={filteredMenuItems}
          formatCurrency={formatCurrency}
          onStartAddingItems={startAddingItems}
          onCancelAddingItems={cancelAddingItems}
          onAddMenuItem={addMenuItemToPreparing}
          onUpdateAddingQuantity={updateAddingItemQuantity}
          onRemoveAddingItem={removeAddingItem}
          onSaveAddedItems={handleSaveAddedItems}
          onMarkOrderReady={handleMarkOrderReady}
        />

        {/* Ready for Pickup */}
        <ReadyOrdersPanel
          orders={dashboardData.readyOrders}
          loading={loading}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Utilities bar */}
      <BackOfHouseUtilities />
    </div>
  );
};

export default KitchenStaffDashboard;
