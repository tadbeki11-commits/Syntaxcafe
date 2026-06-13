import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import usePaymentsItemsData from './hooks/usePaymentsItemsData';
import FilterCard from './components/FilterCard';
import StatsCards from './components/StatsCards';
import ItemsTable from './components/ItemsTable';

export const PaymentsItems: React.FC = () => {
  const {
    loading,
    refreshing,
    orders,
    timeFilter,
    setTimeFilter,
    customMode,
    setCustomMode,
    customDate,
    setCustomDate,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    unitFilter,
    setUnitFilter,
    viewingLabel,
    itemsRows,
    counts,
    paidPayments,
    handleRefresh
  } = usePaymentsItemsData();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Foods &amp; Drinks Sold"
        description="Aggregated breakdown of individual sold items matching paid transactions"
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <FilterCard
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        customMode={customMode}
        setCustomMode={setCustomMode}
        customDate={customDate}
        setCustomDate={setCustomDate}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        unitFilter={unitFilter}
        setUnitFilter={setUnitFilter}
        viewingLabel={viewingLabel}
      />

      <StatsCards counts={counts} />

      <ItemsTable
        ordersCount={orders.length}
        paidCount={paidPayments.length}
        itemsRows={itemsRows}
      />
    </div>
  );
};

export default PaymentsItems;
