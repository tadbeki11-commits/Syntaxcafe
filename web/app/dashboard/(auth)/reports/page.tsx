"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart2,
  Download,
  FileText,
  ListOrdered,
  PackageSearch,
  PieChart,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Orders, Payments, Menu, Expenses } from "@/lib/resources";
import {
  INITIAL_REPORT_DATA,
  calculateReportData,
  exportBusinessData,
  filterSourceDataByDateRange,
  type SourceData,
} from "@/lib/reports";

import { ReportsStats } from "@/components/reports/reports-stats";
import { ProfitSummary } from "@/components/reports/profit-summary";
import { RevenueTrend } from "@/components/reports/revenue-trend";
import { PaymentMethodsBreakdown } from "@/components/reports/payment-methods-breakdown";
import { CategorySales } from "@/components/reports/category-sales";
import { HourlyPerformance } from "@/components/reports/hourly-performance";
import { PopularMenuItems } from "@/components/reports/popular-menu-items";
import { RecentOrdersList } from "@/components/reports/recent-orders-list";
import { ZReport } from "@/components/reports/z-report";

const inputCls = "border-input bg-background h-9 rounded-md border px-3 text-sm";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<SourceData>({ orders: [], payments: [], menuItems: [] });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [businessUnit, setBusinessUnit] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [topItemsPeriod, setTopItemsPeriod] = useState("selected_range");

  const loadSource = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [orders, payments, menuItems, expenseRows] = await Promise.all([
        Orders.list().catch(() => []),
        Payments.history().catch(() => []),
        Menu.items().catch(() => []),
        Expenses.list().catch(() => []),
      ]);
      setSource({
        orders: Array.isArray(orders) ? orders : [],
        payments: Array.isArray(payments) ? payments : [],
        menuItems: Array.isArray(menuItems) ? menuItems : [],
      });
      setExpenses(Array.isArray(expenseRows) ? expenseRows : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load report data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSource();
  }, []);

  const reportData = useMemo(() => {
    if (loading) return INITIAL_REPORT_DATA;
    const filtered = filterSourceDataByDateRange(
      source.orders,
      source.payments,
      source.menuItems,
      dateFrom,
      dateTo,
    );
    return calculateReportData(
      filtered.orders,
      filtered.payments,
      filtered.menuItems,
      businessUnit,
      topItemsPeriod,
    );
  }, [loading, source, businessUnit, dateFrom, dateTo, topItemsPeriod]);

  const handleExport = async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error("Invalid date range: From date must be before To date");
      return;
    }
    try {
      await exportBusinessData(source, businessUnit, dateFrom, dateTo);
      toast.success("Export downloaded");
    } catch (e: any) {
      toast.error(e.message || "Failed to export report");
    }
  };

  const handleGenerate = async () => {
    await loadSource(true);
    toast.success("Report refreshed");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports"
        description="Analytics, operational metrics, and complete data exports."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputCls}
              aria-label="From date"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputCls}
              aria-label="To date"
            />
            <select
              value={businessUnit}
              onChange={(e) => setBusinessUnit(e.target.value)}
              className={inputCls}
              aria-label="Business unit">
              <option value="all">All Units</option>
              <option value="cafe">Cafe</option>
              <option value="restaurant">Restaurant</option>
              <option value="barista">Barista</option>
            </select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
            <Button size="sm" onClick={handleGenerate}>
              <BarChart2 className="mr-2 size-4" />
              Generate
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <ReportsStats source={source} unit={businessUnit} dateFrom={dateFrom} dateTo={dateTo} />

          {/* <ProfitSummary
            orders={source.orders}
            payments={source.payments}
            expenses={expenses}
            from={dateFrom}
            to={dateTo}
          /> */}

          <Tabs defaultValue="overview" className="space-y-5 overflow-auto">
            <TabsList className="flex h-auto w-full flex-wrap justify-between gap-1 p-1">
              <TabsTrigger value="overview" className="gap-2">
                <TrendingUp className="size-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="product-mix" className="gap-2">
                <PackageSearch className="size-4" />
                <span className="hidden sm:inline">Product Mix</span>
              </TabsTrigger>
              <TabsTrigger value="sales-breakdown" className="gap-2">
                <PieChart className="size-4" />
                <span className="hidden sm:inline">Sales Breakdown</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="gap-2">
                <BarChart2 className="size-4" />
                <span className="hidden sm:inline">Operations</span>
              </TabsTrigger>
              <TabsTrigger value="z-report" className="gap-2">
                <FileText className="size-4" />
                <span className="hidden sm:inline">Z-Report</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
                <RevenueTrend points={reportData.revenueTrend} />
                <PaymentMethodsBreakdown paymentMethods={reportData.paymentMethods} />
              </div>
            </TabsContent>

            <TabsContent value="product-mix" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
                <PopularMenuItems
                  topItems={reportData.topItems}
                  topItemsPeriod={topItemsPeriod}
                  setTopItemsPeriod={setTopItemsPeriod}
                />
                <CategorySales items={reportData.categorySales} />
              </div>
            </TabsContent>

            <TabsContent value="sales-breakdown" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PaymentMethodsBreakdown paymentMethods={reportData.paymentMethods} />
                <CategorySales items={reportData.categorySales} />
              </div>
            </TabsContent>

            <TabsContent value="operations" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
                <HourlyPerformance items={reportData.hourlyPerformance} />
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-bold">Operational Focus</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Use this view to identify rush hours, staffing pressure, and settlement
                      patterns before adjusting shifts or prep quantities.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="z-report" className="space-y-6">
              <ZReport dateFrom={dateFrom} dateTo={dateTo} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
