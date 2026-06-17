export interface ExpenseLineItem {
  item: string;
  cost: number | string;
}

export interface Expense {
  id: number;
  title: string;
  category: string;
  amount?: number | string;
  total?: number | string;
  paid_to: string;
  notes: string;
  payment_method: string;
  created_at: string;
  user_id?: number | null;
  // Cashier "batch" entries store their line items here instead of a single
  // title/category/amount. Present only for those entries.
  items?: ExpenseLineItem[];
}

export interface ExpenseFormData {
  title: string;
  category: string;
  amount: string;
  paid_to: string;
  notes: string;
  payment_method: string;
}

export interface ExpenseFilters {
  search: string;
  category: string;
  payment_method: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

export interface TrendData {
  label: string;
  amount: string | number;
}

export interface DashboardData {
  cards: {
    today_total: number;
    week_total: number;
    month_total: number;
    top_category: {
      category: string;
      total: number;
    } | null;
  } | null;
  recent_expenses: Expense[];
  trends: {
    daily: TrendData[];
    monthly: TrendData[];
  };
}

export interface ReportsData {
  totals: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  } | null;
  category_totals: {
    category: string;
    category_key: string;
    count: number;
    total: number;
  }[];
  top_expenses: Expense[];
  expense_vs_sales: {
    total_expenses: number;
    total_sales: number;
    difference: number;
    expense_ratio: number;
    date_from: string;
    date_to: string;
  } | null;
}
