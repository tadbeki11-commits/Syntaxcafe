import { ReportData } from './types';

export const INITIAL_REPORT_DATA: ReportData = {
  dailyStats: {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    voidedOrders: 0,
    paidRevenue: 0,
    cafeOrders: 0,
    restaurantOrders: 0,
    baristaOrders: 0
  },
  weeklyStats: {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    voidedOrders: 0,
    paidRevenue: 0,
    avgPaidOrderValue: 0
  },
  monthlyStats: {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    voidedOrders: 0,
    paidRevenue: 0,
    growth: 0
  },
  topItems: [],
  recentOrders: [],
  paymentMethods: {},
  revenueTrend: [],
  categorySales: [],
  hourlyPerformance: []
};
