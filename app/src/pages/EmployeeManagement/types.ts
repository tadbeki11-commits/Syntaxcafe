export interface EmployeeSummary {
  employee_id: string;
  employee_name: string;
  orders_total: number;
  paid_total: number;
  unpaid_total: number;
  orders_count: number;
  payments_count: number;
  last_order_at?: string | null;
}

export interface OrderDetail {
  id: string;
  employee_id: string;
  employee_name: string | null;
  type: string;
  total_amount: number;
  status: string;
  payment_status?: string | null;
  table_number?: string | number | null;
  created_at?: string | null;
}

export interface EmployeeDetailsData {
  orders: OrderDetail[];
}

export interface StatsSummary {
  orders_total: number;
  paid_total: number;
  unpaid_total: number;
  orders_count: number;
  payments_count: number;
}
