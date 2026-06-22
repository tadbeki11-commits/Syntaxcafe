import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Skeleton } from '@/components/ui/skeleton';
import StatsCard from '@/components/common/StatsCard';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, DollarSign, Clipboard } from 'lucide-react';

// Hooks
import { useCashierData } from './hooks/useCashierData';
import { useCashierStats } from './hooks/useCashierStats';
import {
  useCashierPrintingContext,
  CASHIER_REFRESH_EVENT,
} from '@/context/CashierPrintingContext';

// Components
import { HeaderBanner } from './components/HeaderBanner';
import { PrintFailureBanner } from './components/PrintFailureBanner';
import { DateFilterBar } from './components/DateFilterBar';
import { OrdersForPaymentPanel } from './components/OrdersForPaymentPanel';
import { RecentPaymentsPanel } from './components/RecentPaymentsPanel';
import { useEffect } from 'react';
import { ModalSection } from './components/ModalSection';

const CashierDashboard = () => {
  const { user } = useAuth() as any;

  // Printing system — the auto-print engine itself lives in
  // CashierPrintingProvider (mounted in DashboardLayout) so it keeps receiving
  // and printing orders even while the cashier is on another page. Here we just
  // consume that single shared instance.
  const {
    qzStatus,
    testQzPrint,
    printOrderImmediately,
    pollUnprintedOrders,
    stuckPrintOrders,
    retryStuckPrint,
  } = useCashierPrintingContext();

  // Data fetching
  const {
    loading,
    dashboardData,
    syncStatus,
    expandedRecentPaymentIds,
    loadingRecentPaymentOrderIds,
    processingOrders,
    isBlockingPaymentUi,
    showProcessPaymentModal,
    setShowProcessPaymentModal,
    showReportsModal,
    setShowReportsModal,
    showProfileModal,
    setShowProfileModal,
    showConfirmProcessPaymentModal,
    setShowConfirmProcessPaymentModal,
    showProcessPaymentConfirmModal,
    setShowProcessPaymentConfirmModal,
    selectedOrder,
    confirmOrder,
    confirmProcessPaymentOrder,
    paymentMethod,
    setPaymentMethod,
    profileData,
    setProfileData,
    menuItems,
    menuMainCategoryById,
    orderDetailsById,
    orderIndex,
    handleManualSync,
    refreshDashboardData,
    handleConfirmProcessPaymentNo,
    openCancelOrderConfirm,
    openProcessPaymentConfirm,
    toggleRecentPaymentDetails,
    processPaymentWithMethod,
    updateProfile,
    confirmCashPayment,
    requireCancelPassword,
    adminHashedPassword,
  } = useCashierData({
    user,
    printOrderImmediately,
    pollUnprintedOrders
  });
  // The background print engine (in CashierPrintingProvider) dispatches this
  // event after each print pass. While the dashboard is open, refresh its lists
  // so a newly arrived/printed order shows up without waiting for a poll.
  useEffect(() => {
    const onRefresh = () => {
      refreshDashboardData();
    };
    window.addEventListener(CASHIER_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener(CASHIER_REFRESH_EVENT, onRefresh);
    };
  }, [refreshDashboardData]);

  const [mainCategories, setMainCategories] = useState<Array<{ name: string; slug: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = (await (await import('@/application')).default.menu.getMainCategories({ is_active: true })) as any;
        const payload = resp?.data ?? resp;
        const categoriesRaw =
          payload?.data?.mainCategories || payload?.mainCategories || payload?.data || [];
        const normalized = (Array.isArray(categoriesRaw)
          ? categoriesRaw
            .map((entry: any) => {
              const rawSlug = String(entry?.slug || entry?.name || "").trim().toLowerCase();
              const slug = rawSlug.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              if (!slug) return null;
              const name = String(entry?.name || slug).trim().replace(/_/g, ' ');
              return { name, slug };
            })
            .filter((v): v is { name: string; slug: string } => Boolean(v))
          : []) as Array<{ name: string; slug: string }>;
        if (cancelled) return;
        if (normalized.length > 0) setMainCategories(normalized);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stats calculations
  const {
    statsRange,
    setStatsRange,
    customStatsDate,
    setCustomStatsDate,
    businessUnit,
    setBusinessUnit,
    selectedMenuItemId,
    setSelectedMenuItemId,
    tableNumberFilter,
    setTableNumberFilter,
    formatCurrency,
    menuItemsForSelectedUnit,
    getItemSubtotalBirr,
    getOrderUnitBreakdown,
    getOrderSubtotalForUnitAndMenuItem,
    orderMatchesBusinessUnit,
    getPaymentAmountForSelection,
    statsRangeLabel,
    filteredRecentPayments,
    pendingOrdersTotalBirr,
    todayStats
  } = useCashierStats({
    paymentsAll: dashboardData.paymentsAll,
    ordersForPayment: dashboardData.ordersForPayment,
    user,
    menuItems,
    menuMainCategoryById,
    orderDetailsById
  });

  // Sort orders for payment
  const ordersForPaymentSorted = useMemo(() => {
    const list = Array.isArray(dashboardData.ordersForPayment) ? dashboardData.ordersForPayment : [];
    return list
      .slice()
      .sort((a: any, b: any) => {
        const ad = new Date(a?.created_at || a?.updated_at);
        const bd = new Date(b?.created_at || b?.updated_at);
        const at = Number.isNaN(ad.getTime()) ? null : ad.getTime();
        const bt = Number.isNaN(bd.getTime()) ? null : bd.getTime();
        if (at != null && bt != null) return bt - at;
        if (at != null) return -1;
        if (bt != null) return 1;
        return (b?.id || 0) - (a?.id || 0);
      });
  }, [dashboardData.ordersForPayment]);

  // Filter orders for payment by business unit and table
  const visibleOrders = ordersForPaymentSorted.filter((o: any) => {
    const matchesUnit = orderMatchesBusinessUnit(o);
    const filter = tableNumberFilter.trim().toLowerCase();
    const matchesTable = !filter ||
      String(o.table_number ?? '').trim().toLowerCase() === filter;
    return matchesUnit && matchesTable;
  });

  
  // Stats cards data
  const statsCards = [
    {
      title: `${statsRangeLabel} Payments`,
      value: todayStats.paymentsProcessed,
      icon: <CreditCard className="w-5 h-5" />,
      variant: 'info' as const
    },
    {
      title: `${statsRangeLabel} Revenue`,
      value: formatCurrency(todayStats.totalRevenue),
      icon: <DollarSign className="w-5 h-5" />,
      variant: 'success' as const
    },
    {
      title: 'Pending Order',
      value: formatCurrency(pendingOrdersTotalBirr || 0),
      icon: <Clipboard className="w-5 h-5" />,
      variant: 'default' as const
    },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Loading overlay for payment processing */}
      {isBlockingPaymentUi && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center" style={{ zIndex: 2147483647 }}>
          <div className="bg-background rounded-lg p-6 w-full max-w-sm mx-4 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin"></div>
            <p className="text-foreground/80 font-medium">Processing payment...</p>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <HeaderBanner
        businessUnit={businessUnit}
        setBusinessUnit={setBusinessUnit}
        selectedMenuItemId={selectedMenuItemId}
        setSelectedMenuItemId={setSelectedMenuItemId}
        menuItemsForSelectedUnit={menuItemsForSelectedUnit}
        mainCategories={mainCategories}
        qzStatus={qzStatus}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
        onTestPrint={testQzPrint}
      />

      {/* Persistent alert for orders stuck failing to print */}
      <PrintFailureBanner
        stuckOrders={stuckPrintOrders}
        onRetry={retryStuckPrint}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((card, index) => (
          <StatsCard key={index} title={card.title} value={card.value} icon={card.icon} variant={card.variant} />
        ))}
      </div>

      {/* Date Filter */}
      <DateFilterBar
        statsRange={statsRange}
        setStatsRange={setStatsRange}
        customStatsDate={customStatsDate}
        setCustomStatsDate={setCustomStatsDate}
      />

      {/* Main Grid - Orders and Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrdersForPaymentPanel
          orders={visibleOrders}
          loading={loading}
          expandedPaymentIds={expandedRecentPaymentIds}
          loadingOrderIds={loadingRecentPaymentOrderIds}
          processingOrderIds={processingOrders}
          isBlockingPaymentUi={isBlockingPaymentUi}
          businessUnit={businessUnit}
          selectedMenuItemId={selectedMenuItemId}
          tableNumberFilter={tableNumberFilter}
          setTableNumberFilter={setTableNumberFilter}
          formatCurrency={formatCurrency}
          getOrderSubtotalForUnitAndMenuItem={getOrderSubtotalForUnitAndMenuItem}
          getOrderUnitBreakdown={getOrderUnitBreakdown}
          getItemSubtotalBirr={getItemSubtotalBirr}
          toggleRecentPaymentDetails={toggleRecentPaymentDetails}
          onConfirmPayment={openProcessPaymentConfirm}
          onCancelOrder={openCancelOrderConfirm}
        />

        <RecentPaymentsPanel
          payments={filteredRecentPayments}
          loading={loading}
          expandedPaymentIds={expandedRecentPaymentIds}
          loadingOrderIds={loadingRecentPaymentOrderIds}
          orderDetailsById={orderDetailsById}
          orderIndex={orderIndex}
          businessUnit={businessUnit}
          selectedMenuItemId={selectedMenuItemId}
          formatCurrency={formatCurrency}
          getOrderUnitBreakdown={getOrderUnitBreakdown}
          getItemSubtotalBirr={getItemSubtotalBirr}
          getPaymentAmountForSelection={getPaymentAmountForSelection}
          toggleRecentPaymentDetails={toggleRecentPaymentDetails}
        />
      </div>

      {/* Admin Utilities
      <AdminUtilitiesBar
        onProcessPayments={handleQuickProcessPayment}
        onViewReports={() => setShowReportsModal(true)}
        onProfile={() => setShowProfileModal(true)}
      /> */}

      {/* Modals */}
      <ModalSection
        isOnline={syncStatus.online}
        user={user}
        showProcessPaymentModal={showProcessPaymentModal}
        setShowProcessPaymentModal={setShowProcessPaymentModal}
        selectedOrder={selectedOrder}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onProcessPayment={processPaymentWithMethod}
        showConfirmProcessPaymentModal={showConfirmProcessPaymentModal}
        setShowConfirmProcessPaymentModal={setShowConfirmProcessPaymentModal}
        confirmProcessPaymentOrder={confirmProcessPaymentOrder}
        isBlockingPaymentUi={isBlockingPaymentUi}
        isProcessing={processingOrders.has(confirmProcessPaymentOrder?.id)}
        onConfirmCashPayment={() => confirmCashPayment(confirmProcessPaymentOrder, paymentMethod)}
        showProcessPaymentConfirmModal={showProcessPaymentConfirmModal}
        setShowProcessPaymentConfirmModal={setShowProcessPaymentConfirmModal}
        confirmOrder={confirmOrder}
        confirmOrderProcessing={processingOrders.has(confirmOrder?.id)}
        onConfirmCancelOrder={() => handleConfirmProcessPaymentNo(confirmOrder)}
        requireCancelPassword={requireCancelPassword}
        adminCancelHashedPassword={adminHashedPassword}
        onCancelPasswordChange={(val) => {
          try { (globalThis as any).__cancelOrderPwdTyped = val; } catch { }
        }}
        showReportsModal={showReportsModal}
        setShowReportsModal={setShowReportsModal}
        todayStats={todayStats}
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        profileData={profileData}
        setProfileData={setProfileData}
        onUpdateProfile={updateProfile}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

export default CashierDashboard;
