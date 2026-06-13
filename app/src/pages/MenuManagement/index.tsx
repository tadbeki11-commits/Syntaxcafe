import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import OfflineBanner from '@/components/OfflineBanner';

import { useMenuData } from './hooks/useMenuData';
import MenuFilters from './components/MenuFilters';
import MenuItemGrid from './components/MenuItemGrid';
import MenuFormDialog from './components/MenuFormDialog';
import { FASTING_SUB } from './constants';
import { isFasting, normCat } from './utils';

const MenuManagement = () => {
  const {
    isAdmin,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    dialogOpen,
    setDialogOpen,
    selectedItem,
    formData,
    setFormData,
    syncStatus,

    availableCategories,
    mainCategories,
    filteredItems,
    openAdd,
    openEdit,
    toggleAvailability,
    handleImageChange,
    handleSubmit,
    handleAddMainCategory,
    deleteItem,
    recipesMap,
    inventoryItems,
    stockLocations,
    saveRecipe,
    deleteRecipe,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems
  } = useMenuData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={isAdmin ? 'Menu Management' : 'Café Menu'}
        description={isAdmin ? 'Manage bakery and café menu items' : 'Browse available café menu items'}
        actions={isAdmin ? (
          <div className="flex items-center gap-2">
            <Button onClick={openAdd} disabled={!syncStatus.online}>
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          </div>
        ) : undefined}
      />

      {isAdmin && <OfflineBanner online={syncStatus.online} />}

      <MenuFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        isFastingType={isFasting(filterType)}
        availableCategories={availableCategories}
        fastingSubCategories={FASTING_SUB}
        totalItemsCount={filteredItems.length}
        availableItemsCount={filteredItems.filter(i => i.is_available).length}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <MenuItemGrid
        loading={loading}
        filteredItems={filteredItems}
        isAdmin={isAdmin}
        normCat={normCat}
        onToggleAvailability={toggleAvailability}
        onOpenEdit={openEdit}
        onDeleteItem={deleteItem}
        onOpenAdd={openAdd}
        recipesMap={recipesMap}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        paginatedItems={paginatedItems}
      />

      <MenuFormDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedItem={selectedItem}
        formData={formData}
        setFormData={setFormData}
        handleImageChange={handleImageChange}
        handleSubmit={handleSubmit}
        availableCategories={availableCategories}
        mainCategories={mainCategories}
        onAddMainCategory={handleAddMainCategory}
        existingRecipe={selectedItem ? (recipesMap[selectedItem.id] ?? null) : null}
        inventoryItems={inventoryItems}
        stockLocations={stockLocations}
        onSaveRecipe={selectedItem ? (payload) => saveRecipe(selectedItem.id, payload) : undefined}
        onDeleteRecipe={selectedItem ? () => deleteRecipe(selectedItem.id) : undefined}
      />
    </div>
  );
};

export default MenuManagement;
