export interface DailyStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  voidedOrders: number;
  paidRevenue: number;
  cafeOrders: number;
  restaurantOrders: number;
  baristaOrders: number;
}

export interface WeeklyStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  voidedOrders: number;
  paidRevenue: number;
  avgPaidOrderValue: number;
}

export interface MonthlyStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  voidedOrders: number;
  paidRevenue: number;
  growth: number;
}

export interface TopItem {
  name: string;
  sold: number;
  revenue?: number;
}

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface CategorySalesItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface HourlyPerformanceItem {
  hour: string;
  orders: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  created_at: string;
  type: string;
  total_amount: string | number;
  derived_status: 'paid' | 'pending' | 'voided';
  employee_name?: string | null;
  waiter_name?: string | null;
  employee_id?: number | null;
}

export interface ReportData {
  dailyStats: DailyStats;
  weeklyStats: WeeklyStats;
  monthlyStats: MonthlyStats;
  topItems: TopItem[];
  recentOrders: RecentOrder[];
  paymentMethods: Record<string, number>;
  revenueTrend: RevenueTrendPoint[];
  categorySales: CategorySalesItem[];
  hourlyPerformance: HourlyPerformanceItem[];
}

export interface SourceData {
  orders: any[];
  payments: any[];
  menuItems: any[];
}
