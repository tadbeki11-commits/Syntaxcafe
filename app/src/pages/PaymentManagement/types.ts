export interface PaymentRecord {
  id: string;
  order_id: string;
  amount: string;
  payment_method: string | null;
  status: string;
  created_at: string;
  __type?: string;
}

export interface PendingOrderRecord {
  id: string;
  type: string;
  table_number?: string | number;
  total_amount: string | number;
  created_at: string;
  updated_at?: string;
}

export interface PaymentStats {
  pendingCount: number;
  todayRevenue: string;
  completedCount: number;
}
