export interface DashboardStats {
  totalUsers: number;
  totalMenuItems: number;
  todayOrders: number;
  todayRevenue: number;
  allTimeRevenue: number;
  ordersTotal: number;
  paidTotal: number;
  unpaidTotal: number;
  paidDeletedOrdersTotal: number;
  activeEmployees: number;
  totalTables: number;
  occupiedTables: number;
}

export interface DashboardData {
  stats: DashboardStats;
  menuItems: any[];
  allOrders: any[];
  allPayments: any[];
  recentOrders: any[];
  recentPayments: any[];
  todayAttendance: any[];
  inventoryItems: any[];
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface StatsCardData {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant:
    | "default"
    | "info"
    | "success"
    | "warning"
    | "destructive"
    | "secondary";
}
