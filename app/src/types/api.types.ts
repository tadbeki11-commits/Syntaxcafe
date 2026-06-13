export interface User {
  id: string;
  username?: string;
  name: string;
  role: "admin" | "cafe_waiter" | "cashier" | "kitchen_staff";
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  full_name?: string; // used by some frontend components
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  main_category?: string;
  sub_category: string;
  categories?: Array<{
    id?: number;
    name: string;
    slug: string;
    type: string;
    icon?: string | null;
    display_order?: number;
    is_active?: boolean;
  }>;
  type?: "cafe";
  is_available: boolean;
  image_url?: string;
  prep_time_minutes?: number;
  sku?: string;
  barcode?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
  menu_item?: MenuItem;
}

export interface Order {
  id: string;
  type: "cafe";
  status:
    | "pending"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "paid";
  total_amount: number;
  customer_id?: string;
  employee_id?: string;
  table_number?: number;
  order_type_label?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
  employee?: User;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: "cash" | "card" | "mobile_payment";
  status: "pending" | "paid" | "failed" | "refunded";
  qr_code?: string;
  processed_by?: string;
  description?: string;
  paid_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Standard API Response Wrapping
export interface ApiResponse<T> {
  status: "success" | "error";
  message?: string;
  data: T;
}

export interface AuthResponse {
  status: "success";
  message: string;
  user: User;
  token?: string;
  server_time?: string;
}
