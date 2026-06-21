import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { useOrderData } from './hooks/useOrderData';
import { useOrderFiltering } from './hooks/useOrderFiltering';
import { DateFilter } from './components/DateFilter';
import { QueryBar } from './components/QueryBar';
import { OrdersList } from './components/OrdersList';
import { OrderStats } from './components/OrderStats';

interface OrderManagementProps {
  initialFilterStatus?: string;
}

const OrderManagement: React.FC<OrderManagementProps> = ({ initialFilterStatus = 'all' }) => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(() => initialFilterStatus || 'all');
  const [filterType, setFilterType] = useState('all');
  const [selectedDate, setSelectedDate] = useState('today');
  const [inventoryShortage, setInventoryShortage] = useState<any[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { loading, orders, menuMainCategoryById, paidOrderIdSet, usersMap, updateOrderStatus } =
    useOrderData(showCreateModal, user);

  const { filteredOrders } = useOrderFiltering(
    orders,
    menuMainCategoryById,
    paidOrderIdSet,
    searchTerm,
    filterStatus,
    filterType,
    selectedDate,
    user
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType, selectedDate]);

  // Pagination logic
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handleCreateOrder = () => {
    setInventoryShortage(null);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Order Management"
        description={user?.role === 'kitchen_staff' ? 'Kitchen Orders' : 'Manage orders and track progress'}
      />

      <OrderStats orders={filteredOrders} paidOrderIdSet={paidOrderIdSet} />

      {inventoryShortage && inventoryShortage.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-100 p-2 text-rose-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-rose-900">Inventory shortage blocked order creation</p>
                <p className="text-sm text-rose-800">
                  The order was not created because one or more ingredients are below the required quantity.
                </p>
                <ul className="space-y-1 text-sm text-rose-800">
                  {inventoryShortage.slice(0, 3).map((item, index) => (
                    <li key={`${item.inventory_item_id}-${item.location_id}-${index}`}>
                      {item.inventory_item_name} at {item.location_name}: needs {item.required}, has {item.available} {item.unit}
                    </li>
                  ))}
                  {inventoryShortage.length > 3 && (
                    <li>And {inventoryShortage.length - 3} more shortage{inventoryShortage.length - 3 === 1 ? '' : 's'}.</li>
                  )}
                </ul>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setInventoryShortage(null)} className="text-rose-700 hover:bg-rose-100 hover:text-rose-800">
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <DateFilter selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <QueryBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        filterType={filterType}
        onTypeChange={setFilterType}
        userRole={user?.role}
        paidOrderIdSet={paidOrderIdSet}
        menuMainCategoryById={menuMainCategoryById}
      />

      {filteredOrders.length === 0 && <div className='text-center py-8 text-muted-foreground'>No orders found.</div>}
      <OrdersList
        orders={paginatedOrders}
        selectedDate={selectedDate}
        userRole={user?.role}
        paidOrderIdSet={paidOrderIdSet}
        menuMainCategoryById={menuMainCategoryById}
        filterType={filterType}
        onUpdateStatus={updateOrderStatus}
        onCreateNew={handleCreateOrder}
        usersMap={usersMap}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              Previous
            </Button>
            {/* <div className="flex items-center gap-1 ">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPagcleare(page)}
                  className={`h-8 w-8 p-0 ${currentPage === page ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {page}
                </Button>
              ))}
            </div> */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
