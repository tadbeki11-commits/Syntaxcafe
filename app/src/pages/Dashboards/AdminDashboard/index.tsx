import React, { useMemo } from 'react';
import {
  DollarSign,
  Clipboard,
  CreditCard,
  Activity,
  LayoutDashboard,
  Boxes,
  Settings,
  FileText
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminDashboardData } from './hooks/useAdminDashboardData';
import { useDateRange } from './hooks/useDateRange';
import { useOrderFiltering } from './hooks/useOrderFiltering';
import { WelcomeBanner } from './components/WelcomeBanner';
import { DashboardFilters } from './components/DashboardFilters';
import { StatsCardsGrid } from './components/StatsCardsGrid';
import { ManagementCenter } from './components/ManagementCenter';
import { InventoryPanel } from './components/InventoryPanel';
import { OrderStreamPanel } from './components/OrderStreamPanel';
import { RevenuePanel } from './components/RevenuePanel';
import { formatCurrency } from './utils';
import { getMenuItemDepartment } from './utils';
import { StatsCardData } from './types';
import ZReport from '@/pages/Reports/ZReport';

const AdminDashboard = () => {
  const { loading, dashboardData } = useAdminDashboardData();
  const [businessUnit, setBusinessUnit] = React.useState('all');
  const [selectedMenuItemId, setSelectedMenuItemId] = React.useState('all');

  const dateRange = useDateRange('today');

  React.useEffect(() => {
    setSelectedMenuItemId('all');
  }, [businessUnit]);

  const menuItemsForSelectedUnit = useMemo(() => {
    const menuItemsSafe = Array.isArray(dashboardData.menuItems)
      ? dashboardData.menuItems
      : [];

    return businessUnit === 'all'
      ? []
      : menuItemsSafe
        .filter((it: any) => getMenuItemDepartment(it) === businessUnit)
        .slice()
        .sort((a: any, b: any) =>
          String(a?.name || '').localeCompare(String(b?.name || ''))
        );
  }, [dashboardData.menuItems, businessUnit]);

  const filtering = useOrderFiltering(
    dashboardData,
    businessUnit,
    selectedMenuItemId,
    dateRange.withinRange
  );

  const useGlobalTotals = businessUnit === 'all' && selectedMenuItemId === 'all';

  const statsCards: StatsCardData[] = useMemo(() => {
    return [

      {
        title:
          dateRange.timeRange === 'today'
            ? "Today's Orders"
            : dateRange.timeRange === 'all'
              ? 'Total Orders'
              : `${dateRange.timeRangeLabel} Orders`,
        value: useGlobalTotals
          ? (dateRange.timeRange === 'today'
            ? dashboardData.stats.todayOrders
            : dateRange.timeRange === 'all'
              ? dashboardData.allOrders.length
              : (filtering.ordersInRange?.length || 0))
          : (filtering.ordersInRange?.length || 0),
        icon: <Clipboard className="w-5 h-5" />,
        variant: 'warning'
      },
      {
        title:
          dateRange.timeRange === 'today'
            ? "Today's Revenue"
            : dateRange.timeRange === 'all'
              ? 'Total Revenue'
              : `${dateRange.timeRangeLabel} Revenue`,
        value:
          dateRange.timeRange === 'today'
            ? formatCurrency(
              useGlobalTotals
                ? dashboardData.stats.todayRevenue
                : filtering.rangePaidTotal
            )
            : dateRange.timeRange === 'all'
              ? formatCurrency(dashboardData.stats.allTimeRevenue)
              : formatCurrency(filtering.rangePaidTotal),
        icon: <DollarSign className="w-5 h-5" />,
        variant: 'default'
      },
      {
        title: 'Paid Total',
        value: formatCurrency(
          dateRange.timeRange === 'all' && useGlobalTotals
            ? dashboardData.stats.paidTotal
            : filtering.rangePaidTotal
        ),
        icon: <CreditCard className="w-5 h-5" />,
        variant: 'success'
      },
      {
        title: 'Unpaid Total',
        value: formatCurrency(
          dateRange.timeRange === 'all' && useGlobalTotals
            ? dashboardData.stats.unpaidTotal
            : filtering.rangeUnpaidTotal
        ),
        icon: <Activity className="w-5 h-5" />,
        variant: 'warning'
      }
    ];
  }, [
    dashboardData.stats,
    filtering,
    useGlobalTotals,
    dateRange.timeRange,
    dateRange.timeRangeLabel
  ]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <WelcomeBanner />

      <DashboardFilters
        businessUnit={businessUnit}
        setBusinessUnit={setBusinessUnit}
        selectedMenuItemId={selectedMenuItemId}
        setSelectedMenuItemId={setSelectedMenuItemId}
        menuItems={menuItemsForSelectedUnit}
        timeRange={dateRange.timeRange}
        setTimeRange={dateRange.setTimeRange}
        customMode={dateRange.customMode}
        setCustomMode={dateRange.setCustomMode}
        customDate={dateRange.customDate}
        setCustomDate={dateRange.setCustomDate}
        customStartDate={dateRange.customStartDate}
        setCustomStartDate={dateRange.setCustomStartDate}
        customEndDate={dateRange.customEndDate}
        setCustomEndDate={dateRange.setCustomEndDate}
        customRangeText={dateRange.customRangeText}
      />

      <Tabs defaultValue="overview" className="space-y-5">
        <div className="overflow-x-auto rounded-md border bg-card p-1">
          <TabsList className="h-auto w-max min-w-full justify-start bg-transparent p-0">
            <TabsTrigger value="overview" className="gap-2 rounded-md px-4 py-2.5 text-xs">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 rounded-md px-4 py-2.5 text-xs">
              <Boxes className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 rounded-md px-4 py-2.5 text-xs">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="management" className="gap-2 rounded-md px-4 py-2.5 text-xs">
              <Settings className="h-4 w-4" />
              Management
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <StatsCardsGrid cards={statsCards} />
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <OrderStreamPanel
              orders={filtering.recentOrdersInRange}
              getOrderSubtotal={(order) =>
                filtering.getOrderSubtotalForUnitAndMenuItem(
                  order,
                  businessUnit === 'all' ? null : businessUnit,
                  selectedMenuItemId,
                  {}
                )
              }
            />
            <InventoryPanel items={dashboardData.inventoryItems} />
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryPanel items={dashboardData.inventoryItems} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ZReport />
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          <RevenuePanel
            payments={filtering.recentPaymentsInRange}
            getPaymentAmount={filtering.getPaymentAmount}
          />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <ManagementCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
