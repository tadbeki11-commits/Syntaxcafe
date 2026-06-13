export interface OrgFormState {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface ServiceRow {
  description: string;
  cost: string;
}

export interface Organization {
  id?: number;
  localId?: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active?: boolean | number | string;
  credit_balance?: number;
  meta?: any;
  version?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Payment {
  id: number;
  organization_id: number;
  amount: string;
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  organization_id: number;
  payment_id: number | null;
  transaction_date: string;
  notes?: string;
  services: ServiceRow[];
  total_amount: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionHistoryData {
  transactions: Transaction[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreditSummary {
  organization: Organization;
  credit_balance: number;
  total_paid: number;
  total_deducted: number;
  payments: Payment[];
  transactions: Transaction[];
}
