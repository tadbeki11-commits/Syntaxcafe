import LoadingSpinner from '@/components/common/LoadingSpinner';
import { User, ArrowLeft } from 'lucide-react';
import BranchBadge from '@/components/common/BranchBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Custom Hooks & Modular Components
import { useCashierEmployeesData } from './hooks/useCashierEmployeesData';
import { EmployeeSelectView } from './components/CashierEmployees/EmployeeSelectView';
import { EmployeeStatsGrid } from './components/CashierEmployees/EmployeeStatsGrid';
import { ActiveInvoicesTable } from './components/CashierEmployees/ActiveInvoicesTable';
import { CheckoutTimeline } from './components/CashierEmployees/CheckoutTimeline';
import ConfirmCashPaymentModal from '@/pages/Dashboards/CashierDashboard/modals/ConfirmCashPaymentModal';
import SettleAllPaymentsModal from '@/pages/Dashboards/CashierDashboard/modals/SettleAllPaymentsModal';
import CancelOrderModal from '@/pages/Dashboards/CashierDashboard/modals/CancelOrderModal';

const RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Week',
  month: 'Month',
  all: 'All',
};

const CashierEmployees = () => {
  const {
    loading,
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    tableFilter,
    setTableFilter,
    statsRange,
    setStatsRange,
    employeeOrders,
    employeeStats,
    ordersForPaymentSorted,
    loadingOrderIds,
    processingOrders,
    showProcessPaymentConfirmModal,
    confirmProcessPaymentOrder,
    showCancelConfirmModal,
    confirmOrder,
    selectedEmployee,
    paymentMethod,
    setPaymentMethod,
    requireCancelPassword,
    adminHashedPassword,
    normalizeStatus,
    getOrderItemsForRow,
    openProcessPaymentConfirm,
    handleProcessPaymentNo,
    handleProcessPaymentYes,
    pendingSettleTotal,
    showSettleAllModal,
    settlingAll,
    settleAllProgress,
    openSettleAllConfirm,
    handleSettleAllNo,
    handleSettleAll,
    openCancelConfirm,
    handleCancelNo,
    handleCancelYes,
    formatOrderItemsPreview,
    formatCurrency
  } = useCashierEmployeesData();

  if (loading && employees.length === 0) {
    return <LoadingSpinner text="Loading employee operations..." />;
  }

  // FIRST VIEW: employees select view with built-in search filter
  if (!selectedEmployeeId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Cashier Employees
                  </h1>
                  <BranchBadge />
                </div>
              </div>
            </CardContent>
          </Card>

          <EmployeeSelectView
            employees={employees}
            onSelectEmployee={setSelectedEmployeeId}
          />
        </div>
      </div>
    );
  }

  // SECOND VIEW: waiter statistics and checkout management dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <User className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {selectedEmployee?.full_name || selectedEmployeeId}
              </h1>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setSelectedEmployeeId('')}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Employees
            </Button>
          </CardContent>
        </Card>

        <EmployeeStatsGrid stats={employeeStats} formatCurrency={formatCurrency} />

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time Range</p>
            <p className="text-sm text-foreground">Filter the timeline and cashier activity</p>
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
            {['today', 'yesterday', 'week', 'month', 'all'].map((range) => (
              <Button
                key={range}
                variant={statsRange === range ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                onClick={() => setStatsRange(range)}
              >
                {RANGE_LABELS[range] ?? range}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Orders Ready for Cashier Checkout Completion */}
          <ActiveInvoicesTable
            ordersForPaymentSorted={ordersForPaymentSorted}
            tableFilter={tableFilter}
            setTableFilter={setTableFilter}
            getOrderItemsForRow={getOrderItemsForRow}
            loadingOrderIds={loadingOrderIds}
            processingOrders={processingOrders}
            openProcessPaymentConfirm={openProcessPaymentConfirm}
            openCancelConfirm={openCancelConfirm}
            formatCurrency={formatCurrency}
            pendingSettleTotal={pendingSettleTotal}
            settlingAll={settlingAll}
            openSettleAllConfirm={openSettleAllConfirm}
          />

          {/* Right: Recent Orders timeline tracker */}
          <CheckoutTimeline
            employeeOrders={employeeOrders}
            statsRange={statsRange}
            normalizeStatus={normalizeStatus}
            formatOrderItemsPreview={formatOrderItemsPreview}
            formatCurrency={formatCurrency}
          />
        </div>

        <ConfirmCashPaymentModal
          open={showProcessPaymentConfirmModal}
          onOpenChange={(open) => { if (!open) handleProcessPaymentNo(); }}
          confirmProcessPaymentOrder={confirmProcessPaymentOrder}
          isBlockingPaymentUi={false}
          isProcessing={processingOrders.has(confirmProcessPaymentOrder?.id)}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          onConfirm={handleProcessPaymentYes}
          formatCurrency={formatCurrency}
        />

        <SettleAllPaymentsModal
          open={showSettleAllModal}
          onOpenChange={(open) => { if (!open) handleSettleAllNo(); }}
          count={ordersForPaymentSorted.length}
          total={pendingSettleTotal}
          employeeName={selectedEmployee?.full_name}
          isProcessing={settlingAll}
          progress={settleAllProgress}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          onConfirm={handleSettleAll}
          formatCurrency={formatCurrency}
        />

        <CancelOrderModal
          open={showCancelConfirmModal}
          onOpenChange={(open) => { if (!open) handleCancelNo(); }}
          confirmOrder={confirmOrder}
          isProcessing={processingOrders.has(confirmOrder?.id)}
          onConfirm={handleCancelYes}
          formatCurrency={formatCurrency}
          requireCancelPassword={requireCancelPassword}
          currentAdminHashedPassword={adminHashedPassword}
          onCancelPasswordChange={() => {}}
        />
      </div>
    </div>
  );
};

export default CashierEmployees;
