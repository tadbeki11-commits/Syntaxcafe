import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/application';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { getApproximateServerDateString } from '@/shared/utils/serverTime';
import { ReportData, SourceData } from '../types';
import { INITIAL_REPORT_DATA } from '../constants';
import {
  extractCollection,
  buildSheetFromRows,
  filterSourceDataByDateRange,
  calculateReportData,
  generateCSVReport,
  normalizeStatus,
  isVoidedOrderStatus,
  normalizeId,
  normalizeOrderType,
  toIsoIfValid,
  getEarlierIso,
  getLaterIso,
  makeGetItemDepartment,
  makeGetOrderSubtotalForUnit,
  makeIsPaidOrder
} from '../utils';

export const useReportsData = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [businessUnit, setBusinessUnit] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [topItemsPeriod, setTopItemsPeriod] = useState('selected_range');
  const [sourceData, setSourceData] = useState<SourceData>({
    orders: [],
    payments: [],
    menuItems: []
  });
  const [reportData, setReportData] = useState<ReportData>({ ...INITIAL_REPORT_DATA });

  const fetchLatestSourceData = useCallback(async (fallbackSourceData: any = null) => {
    const fallback = fallbackSourceData && typeof fallbackSourceData === 'object'
      ? fallbackSourceData
      : {};

    const [ordersResult, paymentsResult, menuResult] = await Promise.allSettled([
      api.orders.getAll(),
      api.payments.getAll(),
      api.menu.getAll()
    ]);

    if (ordersResult.status === 'rejected') {
      console.error('Error fetching orders for reports:', ordersResult.reason);
    }
    if (paymentsResult.status === 'rejected') {
      console.error('Error fetching payments for reports:', paymentsResult.reason);
    }
    if (menuResult.status === 'rejected') {
      console.error('Error fetching menu items for reports:', menuResult.reason);
    }

    return {
      orders: ordersResult.status === 'fulfilled'
        ? extractCollection(ordersResult.value, 'orders')
        : (Array.isArray(fallback?.orders) ? fallback.orders : []),
      payments: paymentsResult.status === 'fulfilled'
        ? extractCollection(paymentsResult.value, 'payments')
        : (Array.isArray(fallback?.payments) ? fallback.payments : []),
      menuItems: menuResult.status === 'fulfilled'
        ? extractCollection(menuResult.value, 'menuItems')
        : (Array.isArray(fallback?.menuItems) ? fallback.menuItems : [])
    };
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const latestSourceData = await fetchLatestSourceData();
        setSourceData({
          orders: Array.isArray(latestSourceData.orders) ? latestSourceData.orders : [],
          payments: Array.isArray(latestSourceData.payments) ? latestSourceData.payments : [],
          menuItems: Array.isArray(latestSourceData.menuItems) ? latestSourceData.menuItems : []
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [fetchLatestSourceData]);

  useEffect(() => {
    const filteredSourceData = filterSourceDataByDateRange(
      sourceData.orders,
      sourceData.payments,
      sourceData.menuItems,
      dateFrom,
      dateTo
    );

    setReportData(
      calculateReportData(
        filteredSourceData.orders,
        filteredSourceData.payments,
        filteredSourceData.menuItems,
        businessUnit,
        topItemsPeriod
      )
    );
  }, [
    sourceData.orders,
    sourceData.payments,
    sourceData.menuItems,
    businessUnit,
    dateFrom,
    dateTo,
    topItemsPeriod
  ]);

  const handleExportReport = async () => {
    const downloadXlsx = (workbook: any, filename: string) => {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    try {
      if (dateFrom && dateTo && dateFrom > dateTo) {
        toast.error('Invalid date range: From date must be before To date');
        return;
      }

      const loadingToastId = toast.loading('Preparing export...');
      const latestSourceData = await fetchLatestSourceData(sourceData);

      const filteredSourceData = filterSourceDataByDateRange(
        latestSourceData.orders,
        latestSourceData.payments,
        latestSourceData.menuItems,
        dateFrom,
        dateTo
      );

      const safeOrders = Array.isArray(filteredSourceData.orders) ? filteredSourceData.orders : [];
      const safePayments = Array.isArray(filteredSourceData.payments) ? filteredSourceData.payments : [];
      const safeMenuItems = Array.isArray(filteredSourceData.menuItems) ? filteredSourceData.menuItems : [];
      const allOrders = Array.isArray(latestSourceData.orders) ? latestSourceData.orders : [];
      const selectedUnit = String(businessUnit || 'all').trim().toLowerCase() || 'all';

      const getItemDepartment = makeGetItemDepartment(safeMenuItems);
      const getOrderSubtotalForUnit = makeGetOrderSubtotalForUnit(getItemDepartment);

      const paidPayments = safePayments.filter((p) => normalizeStatus(p?.status) === 'paid');
      const paidOrderIdSet = new Set(paidPayments.map((p) => normalizeId(p?.order_id)).filter(Boolean));
      const allOrdersById = new Map(allOrders.map((order) => [normalizeId(order?.id), order]));

      const isPaidOrder = makeIsPaidOrder(paidOrderIdSet);

      const getDerivedStatus = (order: any) => {
        if (isVoidedOrderStatus(order?.status)) return 'voided';
        if (isPaidOrder(order)) return 'paid';
        return 'pending';
      };

      const orderMatchesUnit = (order: any) => {
        if (selectedUnit === 'all') return true;
        return getOrderSubtotalForUnit(order, selectedUnit) > 0;
      };

      const getOrderTotalForSelectedUnit = (order: any) => {
        if (selectedUnit === 'all') return getOrderSubtotalForUnit(order, 'all');
        return getOrderSubtotalForUnit(order, selectedUnit);
      };

      const paymentMatchesUnit = (payment: any) => {
        if (selectedUnit === 'all') return true;
        const order = allOrdersById.get(normalizeId(payment?.order_id));
        if (order) return orderMatchesUnit(order);
        return normalizeOrderType(payment?.order_type) === selectedUnit;
      };

      const relevantOrders = safeOrders.filter((order) => orderMatchesUnit(order));
      const activeOrders = relevantOrders.filter((order) => !isVoidedOrderStatus(order?.status));
      const paidOrders = activeOrders.filter((order) => isPaidOrder(order));
      const pendingOrders = activeOrders.filter((order) => !isPaidOrder(order));
      const voidedOrders = relevantOrders.filter((order) => isVoidedOrderStatus(order?.status));
      const relevantPayments = safePayments.filter((payment) => paymentMatchesUnit(payment));
      const relevantPaidPayments = relevantPayments.filter((payment) => normalizeStatus(payment?.status) === 'paid');
      const exportMetrics = calculateReportData(safeOrders, safePayments, safeMenuItems, selectedUnit);

      const itemSummaryMap = new Map<string, any>();
      safeOrders
        .filter((order) => !isVoidedOrderStatus(order?.status))
        .filter((order) => orderMatchesUnit(order))
        .forEach((o) => {
          const items = Array.isArray(o?.items) ? o.items : [];
          const paid = isPaidOrder(o);
          for (const it of items) {
            const orderFallback = String(o?.type || '').trim().toLowerCase();
            const fallbackDept = orderFallback === 'bakery' ? 'cafe' : (orderFallback || null);
            const dept = getItemDepartment(it) || fallbackDept;
            if (selectedUnit !== 'all' && dept !== selectedUnit) continue;
            
            const getItemSubtotalLocal = (item: any) => {
              const qty = parseFloat(item?.quantity || 0);
              const subtotal = parseFloat(item?.subtotal);
              if (Number.isFinite(subtotal)) return subtotal;
              const unitPrice = parseFloat(item?.unit_price);
              if (Number.isFinite(unitPrice) && qty > 0) return unitPrice * qty;
              const price = parseFloat(item?.price);
              if (Number.isFinite(price) && qty > 0) return price * qty;
              return 0;
            };

            const mid = it?.menu_item_id != null ? it.menu_item_id : null;
            const qty = parseFloat(it?.quantity || 0);
            const revenue = getItemSubtotalLocal(it);
            const key = Number.isFinite(mid)
              ? `menu-${mid}`
              : `name-${String(it?.menu_item_name || it?.name || 'unknown').trim().toLowerCase()}`;
            
            const existing = itemSummaryMap.get(key) || {
              menu_item_id: Number.isFinite(mid) ? mid : null,
              menu_item_name: it?.menu_item_name || it?.name || 'Unknown Item',
              category: it?.category || it?.sub_category || null,
              main_category: it?.main_category || null,
              business_unit: dept || normalizeOrderType(o?.type) || 'unknown',
              first_ordered_at: null as any,
              last_ordered_at: null as any,
              first_paid_at: null as any,
              last_paid_at: null as any,
              ordered_qty: 0,
              paid_qty: 0,
              ordered_revenue: 0,
              paid_revenue: 0
            };

            const orderedAt = toIsoIfValid(o?.created_at);
            const paidAt = toIsoIfValid(o?.paid_at) || orderedAt;

            existing.ordered_qty += Number.isFinite(qty) ? qty : 0;
            existing.ordered_revenue += Number.isFinite(revenue) ? revenue : 0;
            existing.first_ordered_at = getEarlierIso(existing.first_ordered_at, orderedAt);
            existing.last_ordered_at = getLaterIso(existing.last_ordered_at, orderedAt);
            if (paid) {
              existing.paid_qty += Number.isFinite(qty) ? qty : 0;
              existing.paid_revenue += Number.isFinite(revenue) ? revenue : 0;
              existing.first_paid_at = getEarlierIso(existing.first_paid_at, paidAt);
              existing.last_paid_at = getLaterIso(existing.last_paid_at, paidAt);
            }

            itemSummaryMap.set(key, existing);
          }
        });

      const exportSummary = (() => {
        const paidRevenue = paidOrders.reduce((sum, order) => sum + getOrderTotalForSelectedUnit(order), 0);
        const paymentsTotal = relevantPaidPayments.reduce((sum, payment) => sum + (parseFloat(payment?.amount) || 0), 0);
        return {
          totalOrders: activeOrders.length,
          paidOrders: paidOrders.length,
          pendingOrders: pendingOrders.length,
          voidedOrders: voidedOrders.length,
          paidRevenue,
          totalPayments: relevantPayments.length,
          paidPayments: relevantPaidPayments.length,
          paymentsTotal,
        };
      })();

      const wb = XLSX.utils.book_new();

      const summaryAoa = [
        ['Report', 'Business Data Export'],
        ['Business Unit', selectedUnit === 'all' ? 'All' : selectedUnit],
        ['Date From', dateFrom || 'All'],
        ['Date To', dateTo || 'All'],
        ['Generated At', getApproximateServerDateString()],
        
        ['Summary Metric', 'Value'],
        ['Total Orders', exportSummary.totalOrders],
        ['Paid Orders', exportSummary.paidOrders],
        ['Pending Orders', exportSummary.pendingOrders],
        ['Voided Orders', exportSummary.voidedOrders],
        ['Paid Revenue (Orders Total)', exportSummary.paidRevenue],
        ['Payments Count', exportSummary.totalPayments],
        ['Paid Payments Count', exportSummary.paidPayments],
        ['Paid Payments Total', exportSummary.paymentsTotal],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      const orderHeaders = [
        'order_id',
        'created_at',
        'type',
        'status',
        'derived_status',
        'payment_status',
        'employee_id',
        'employee_name',
        'table_number',
        'total_amount',
        'selected_unit',
        'selected_unit_total_amount',
        'notes',
        'menu_item_id',
        'menu_item_name',
        'category',
        'main_category',
        'item_type',
        'quantity',
        'unit_price',
        'subtotal'
      ];

      const paymentHeaders = [
        'payment_id',
        'created_at',
        'order_id',
        'order_type',
        'selected_unit',
        'amount',
        'payment_method',
        'status',
        'processed_by',
        'processed_by_name',
        'description'
      ];

      const itemSummaryHeaders = [
        'menu_item_id',
        'menu_item_name',
        'category',
        'main_category',
        'business_unit',
        'first_ordered_at',
        'last_ordered_at',
        'first_paid_at',
        'last_paid_at',
        'ordered_qty',
        'paid_qty',
        'ordered_revenue',
        'paid_revenue'
      ];

      const orderRows: any[] = [];
      relevantOrders.forEach((order) => {
        const items = Array.isArray(order?.items) ? order.items : [];
        const orderFallback = String(order?.type || '').trim().toLowerCase();
        const fallbackDept = orderFallback === 'bakery' ? 'cafe' : (orderFallback || null);
        const relevantItems = selectedUnit === 'all'
          ? items
          : items.filter((item: any) => (getItemDepartment(item) || fallbackDept) === selectedUnit);
        const selectedUnitTotal = getOrderTotalForSelectedUnit(order);
        const derivedStatus = getDerivedStatus(order);

        if (relevantItems.length === 0) {
          orderRows.push({
            order_id: order?.id,
            created_at: order?.created_at,
            type: order?.type,
            status: order?.status,
            derived_status: derivedStatus,
            payment_status: order?.payment_status,
            employee_id: order?.employee_id,
            employee_name: order?.employee_name,
            table_number: order?.table_number,
            total_amount: order?.total_amount,
            selected_unit: selectedUnit,
            selected_unit_total_amount: selectedUnitTotal,
            notes: order?.notes,
            menu_item_id: null,
            menu_item_name: null,
            category: null,
            main_category: null,
            item_type: null,
            quantity: null,
            unit_price: null,
            subtotal: null,
          });
          return;
        }

        relevantItems.forEach((it: any) => {
          orderRows.push({
            order_id: order?.id,
            created_at: order?.created_at,
            type: order?.type,
            status: order?.status,
            derived_status: derivedStatus,
            payment_status: order?.payment_status,
            employee_id: order?.employee_id,
            employee_name: order?.employee_name,
            table_number: order?.table_number,
            total_amount: order?.total_amount,
            selected_unit: selectedUnit,
            selected_unit_total_amount: selectedUnitTotal,
            notes: order?.notes,
            menu_item_id: it?.menu_item_id,
            menu_item_name: it?.menu_item_name || it?.name,
            category: it?.category,
            main_category: it?.main_category,
            item_type: it?.item_type,
            quantity: it?.quantity,
            unit_price: it?.unit_price,
            subtotal: it?.subtotal,
          });
        });
      });
      const ordersSheet = buildSheetFromRows(orderRows, orderHeaders);
      XLSX.utils.book_append_sheet(wb, ordersSheet, 'Orders');

      const paymentRows = relevantPayments.map((p) => ({
        payment_id: p?.id,
        created_at: p?.created_at,
        order_id: p?.order_id,
        order_type: p?.order_type,
        selected_unit: selectedUnit,
        amount: p?.amount,
        payment_method: p?.payment_method,
        status: p?.status,
        processed_by: p?.processed_by,
        processed_by_name: p?.processed_by_name,
        description: p?.description,
      }));
      const paymentsSheet = buildSheetFromRows(paymentRows, paymentHeaders);
      XLSX.utils.book_append_sheet(wb, paymentsSheet, 'Payments');

      const itemSummaryRows = Array.from(itemSummaryMap.values())
        .sort((a, b) => (b.ordered_qty || 0) - (a.ordered_qty || 0));
      const itemSummarySheet = buildSheetFromRows(itemSummaryRows, itemSummaryHeaders);
      XLSX.utils.book_append_sheet(wb, itemSummarySheet, 'Items Summary');

      const categorySheet = buildSheetFromRows(exportMetrics.categorySales || [], [
        'name',
        'quantity',
        'revenue'
      ]);
      XLSX.utils.book_append_sheet(wb, categorySheet, 'Category Sales');

      const hourlySheet = buildSheetFromRows(exportMetrics.hourlyPerformance || [], [
        'hour',
        'orders',
        'revenue'
      ]);
      XLSX.utils.book_append_sheet(wb, hourlySheet, 'Hourly Performance');

      const trendSheet = buildSheetFromRows(exportMetrics.revenueTrend || [], [
        'label',
        'orders',
        'revenue'
      ]);
      XLSX.utils.book_append_sheet(wb, trendSheet, 'Revenue Trend');

      const metricsCsv = generateCSVReport(exportMetrics);
      const metricsAoa = String(metricsCsv || '')
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => line.split(',').map((cell) => String(cell || '').replace(/^"|"$/g, '').replace(/""/g, '"')));
      const metricsSheet = XLSX.utils.aoa_to_sheet(metricsAoa);
      XLSX.utils.book_append_sheet(wb, metricsSheet, 'Metrics');

      const today = getApproximateServerDateString();
      const fromSlug = dateFrom || 'all';
      const toSlug = dateTo || 'all';
      const unitSlug = selectedUnit || 'all';
      const filename = `business-data-${unitSlug}-${fromSlug}-to-${toSlug}-${today}.xlsx`;

      downloadXlsx(wb, filename);

      toast.dismiss(loadingToastId);
      toast.success('Export downloaded successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.dismiss();
      toast.error('Failed to export report');
    }
  };

  const handleInventoryReports = () => {
    navigate('/dashboard/inventory');
  };

  const handleCustomerAnalytics = () => {
    toast('Customer Analytics feature coming soon!');
  };

  const handlePerformanceMetrics = () => {
    navigate('/dashboard/performance');
  };

  const handleGenerateReport = async () => {
    try {
      toast.loading('Generating fresh report...');
      const [ordersResponse, paymentsResponse, menuResponse] = await Promise.all([
        api.orders.getAll(),
        api.payments.getAll(),
        api.menu.getAll()
      ]);

      const orders = (ordersResponse?.data?.data as any)?.orders ?? (ordersResponse as any)?.data?.orders ?? ordersResponse?.data?.data ?? [];
      const payments = (paymentsResponse?.data?.data as any)?.payments ?? (paymentsResponse as any)?.data?.payments ?? paymentsResponse?.data?.data ?? [];
      const menuItems = (menuResponse?.data?.data as any)?.menuItems ?? (menuResponse as any)?.data?.menuItems ?? menuResponse?.data?.data ?? [];

      setSourceData({
        orders: Array.isArray(orders) ? orders : [],
        payments: Array.isArray(payments) ? payments : [],
        menuItems: Array.isArray(menuItems) ? menuItems : []
      });

      toast.dismiss();
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss();
      toast.error('Failed to generate report');
    }
  };

  return {
    loading,
    businessUnit,
    setBusinessUnit,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    topItemsPeriod,
    setTopItemsPeriod,
    reportData,
    handleExportReport,
    handleGenerateReport,
    handleInventoryReports,
    handleCustomerAnalytics,
    handlePerformanceMetrics
  };
};
export default useReportsData;
