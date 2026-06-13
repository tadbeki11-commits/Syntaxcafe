import React, { useMemo, useState } from 'react';
import { Plus, RefreshCw, ArrowLeftRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useInventoryData from './hooks/useInventoryData';
import { useLocationStats } from './hooks/useLocationStats';
import { useQuantityFormatter } from './hooks/useQuantityFormatter';
import InventoryStats from './components/InventoryStats';
import InventoryFormDialog from './components/InventoryFormDialog';
import InventoryQtyDialog from './components/InventoryQtyDialog';
import StockTransferDialog from './components/StockTransferDialog';
import StockLocationsTab from './components/StockLocationsTab';
import LocationsGrid from './components/LocationsGrid';
import LocationItemsView from './components/LocationItemsView';
import MovementHistoryDialog from './components/MovementHistoryDialog';
import OfflineBanner from '@/components/OfflineBanner';
import { NormalizedInventoryItem } from './types';
import { printInventoryLocationReceipt } from '@/utils/receiptPrinter';

export const InventoryManagement: React.FC = () => {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    editDialog,
    setEditDialog,
    qtyDialog,
    setQtyDialog,
    transferDialog,
    setTransferDialog,
    isAdding,
    selectedItem,
    setSelectedItem,
    formData,
    setFormData,
    qtyData,
    setQtyData,
    transferData,
    setTransferData,
    stockLocations,
    fetchAll,
    normalizedItems,
    filtered,
    lowStockCount,
    openAdd,
    openEdit,
    openQty,
    openHistory,
    openTransfer,
    isSubmittingForm,
    isSubmittingTransfer,
    submitForm,
    submitQty,
    submitTransfer,
    receiveTransfer,
    printTransferReceipts,
    deleteItem,
    transfers,
    syncStatus,
    movements,
    movementLoading,
    page,
    limit,
    totalCount,
    totalPages,
    setPage,
    setLimit,
    transferPage,
    transferLimit,
    transferTotalCount,
    transferTotalPages,
    setTransferPage,
    setTransferLimit,
  } = useInventoryData();

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { formatQuantity } = useQuantityFormatter();
  const locationStats = useLocationStats(stockLocations, normalizedItems);

  const selectedLocation = useMemo(() => {
    return stockLocations.find(l => l.id === selectedLocationId) || null;
  }, [stockLocations, selectedLocationId]);

  const filteredLocationItems = useMemo(() => {
    if (selectedLocationId === null) return [];
    
    const defaultLocation = stockLocations.find(l => l.is_default);
    const isDefaultLocation = defaultLocation?.id === selectedLocationId;
    
    return filtered.filter(item => {
      const entry = item.stock_by_location?.find((s: any) => s.location_id === selectedLocationId);
      const hasStockByLocation = item.stock_by_location && item.stock_by_location.length > 0;
      
      // If item has no stock_by_location entries, show it only in the default location
      if (!hasStockByLocation) {
        return isDefaultLocation;
      }
      
      // Only show items that have a stock entry for this location
      if (!entry) return false;
      
      const qty = Number(entry.quantity);
      
      if (showOnlyInStock) {
        return qty > 0;
      }
      return true;
    });
  }, [filtered, selectedLocationId, showOnlyInStock, stockLocations]);

  const handleOpenQty = (item: NormalizedInventoryItem) => {
    setSelectedItem(item);
    const entry = item.stock_by_location?.find((s: any) => s.location_id === selectedLocationId);
    const currentQty = entry ? Number(entry.quantity) : 0;
    
    setQtyData({
      mode: 'set',
      location: '',
      location_id: selectedLocationId,
      quantity: String(currentQty),
      delta: '',
      quantity_unit: 'base',
    });
    setQtyDialog(true);
  };

  const handleOpenHistory = async (item: NormalizedInventoryItem) => {
    await openHistory(item);
    setHistoryOpen(true);
  };

  const handlePrintInventory = async () => {
    if (selectedLocation) {
      await printInventoryLocationReceipt(selectedLocation, normalizedItems);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Manage stock levels and track transfers between locations."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={openTransfer} disabled={!syncStatus.online}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Transfer Stock
            </Button>
            <Button onClick={() => openAdd(selectedLocationId)} disabled={!syncStatus.online}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        }
      />

      <OfflineBanner online={syncStatus.online} />

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="stock-history">
            Stock &amp; History
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Inventory ── */}
        <TabsContent value="inventory" className="mt-4 space-y-6">
          {selectedLocationId === null ? (
            <div className="space-y-6">
              <InventoryStats
                totalItems={normalizedItems.length}
                lowStockCount={lowStockCount}
                baristaItemsCount={normalizedItems.filter(i => Number(i.barista_quantity || 0) > 0).length}
              />

              <div>
                <h3 className="text-lg font-semibold mb-1">Select an Inventory Location</h3>
                <p className="text-sm text-muted-foreground">Click a location to explore, adjust quantities, and manage configured items.</p>
              </div>

              <LocationsGrid
                stockLocations={stockLocations}
                locationStats={locationStats}
                onLocationClick={setSelectedLocationId}
              />
            </div>
          ) : (
            <LocationItemsView
              selectedLocation={selectedLocation}
              selectedLocationId={selectedLocationId}
              showOnlyInStock={showOnlyInStock}
              setShowOnlyInStock={setShowOnlyInStock}
              filteredLocationItems={filteredLocationItems}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              loading={loading}
              formatQuantity={formatQuantity}
              onBack={() => setSelectedLocationId(null)}
              onUpdateQty={handleOpenQty}
              onHistory={handleOpenHistory}
              onEdit={openEdit}
              onDelete={deleteItem}
              onPrint={handlePrintInventory}
              page={page}
              limit={limit}
              totalCount={totalCount}
              totalPages={totalPages}
              setPage={setPage}
              setLimit={setLimit}
            />
          )}
        </TabsContent>

        {/* ── Tab 2: Stock & History ── */}
        <TabsContent value="stock-history" className="mt-4">
          <StockLocationsTab
            items={normalizedItems}
            stockLocations={stockLocations}
            transfers={transfers}
            onReceive={receiveTransfer}
            onPrintReceipts={printTransferReceipts}
            onRefresh={fetchAll}
            transferPage={transferPage}
            transferLimit={transferLimit}
            transferTotalCount={transferTotalCount}
            transferTotalPages={transferTotalPages}
            setTransferPage={setTransferPage}
            setTransferLimit={setTransferLimit}
          />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <InventoryFormDialog
        editDialog={editDialog}
        setEditDialog={setEditDialog}
        isAdding={isAdding}
        isSubmitting={isSubmittingForm}
        formData={formData}
        setFormData={setFormData}
        submitForm={submitForm}
        stockLocations={stockLocations}
      />

      <InventoryQtyDialog
        qtyDialog={qtyDialog}
        setQtyDialog={setQtyDialog}
        selectedItem={selectedItem}
        qtyData={qtyData}
        setQtyData={setQtyData}
        submitQty={submitQty}
        stockLocations={stockLocations}
      />

      <StockTransferDialog
        transferDialog={transferDialog}
        setTransferDialog={setTransferDialog}
        items={normalizedItems}
        isSubmitting={isSubmittingTransfer}
        transferData={transferData}
        setTransferData={setTransferData}
        submitTransfer={submitTransfer}
      />

      <MovementHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        movements={movements}
        loading={movementLoading}
        itemName={selectedItem?.name || ''}
      />
    </div>
  );
};

export default InventoryManagement;
