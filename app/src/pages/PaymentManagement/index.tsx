import React from 'react';
import PageHeader from '@/components/layout/PageHeader';
import usePaymentData from './hooks/usePaymentData';
import PaymentStats from './components/PaymentStats';
import PendingOrders from './components/PendingOrders';
import PaymentFilters from './components/PaymentFilters';
import PaymentsTable from './components/PaymentsTable';
import ViewPaymentDialog from './components/ViewPaymentDialog';

export const PaymentManagement: React.FC = () => {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterMethod,
    setFilterMethod,
    viewOpen,
    setViewOpen,
    viewLoading,
    viewPayment,
    viewOrder,
    filteredPayments,
    ordersForPayment,
    openView,
    stats,
    paymentMethods,
    page,
    setPage,
    pageSize,
    totalCount,
    totalPages
  } = usePaymentData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Payment Management"
        description="Process payments and manage transactions"
      />

      <PaymentStats stats={stats} />

      <PendingOrders ordersForPayment={ordersForPayment} />

      <PaymentFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterMethod={filterMethod}
        setFilterMethod={setFilterMethod}
        paymentMethods={paymentMethods}
      />

      <PaymentsTable
        loading={loading}
        filteredPayments={filteredPayments}
        openView={openView}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />

      <ViewPaymentDialog
        viewOpen={viewOpen}
        setViewOpen={setViewOpen}
        viewLoading={viewLoading}
        viewPayment={viewPayment}
        viewOrder={viewOrder}
      />
    </div>
  );
};

export default PaymentManagement;
