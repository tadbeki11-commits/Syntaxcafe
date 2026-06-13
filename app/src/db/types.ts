import { User, MenuItem, Order, Payment } from '../types/api.types';

export interface LocalUser extends Omit<User, 'id'> {
  id: string;
  pin: string;
  passcode: string;
  cancel_password?: string | null;
  synced?: 0 | 1;
}

export interface LocalRole {
  id: string;
  name: string;
  display_name: string;
  description?: string | null;
  is_active?: boolean;
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalPaymentMethod {
  id: string;
  name: string;
  display_name: string;
  icon?: string | null;
  description?: string | null;
  is_active?: boolean;
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalMenuItem extends Omit<MenuItem, 'id' | 'categories'> {
  id: string;
  categories?: LocalCategory[];
  prep_time_minutes?: number;
  sku?: string;
  barcode?: string;
  synced?: 0 | 1;
}

export interface LocalCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  display_order?: number;
  type: 'main' | 'tag' | 'promotion' | 'seasonal' | 'channel' | 'workflow' | string;
  is_active?: boolean;
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalMainCategory {
  id: string;
  name: string;
  slug: string;
  display_order?: number;
  is_active?: boolean;
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalMenuItemCategory {
  id: string;
  menu_item_id: string;
  category_id: string;
  synced?: 0 | 1;
  created_at?: string;
}

export interface LocalTable {
  id: string;
  table_number: number;
  status: 'available' | 'occupied' | 'reserved';
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalOrder extends Omit<Order, 'id'> {
  id: string;
  synced: 0 | 1;        // 0 = unsynced local order, 1 = successfully synced to server
  is_printed: 0 | 1;    // Whether this order ticket has been printed locally via QZ Tray
  payment_status?: string;
  waiter_id?: string;
  created_by_id?: string;
}

export interface LocalPayment extends Omit<Payment, 'id'> {
  id: string;
  synced: 0 | 1;
}

export interface LocalAttendance {
  id: string;
  user_id: string;
  full_name?: string;
  username?: string;
  role?: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  hours_worked: number | string | null;
  status?: string;
  synced: 0 | 1;
}

export type StockLocationSlug = string;
export type StockTransferStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface LocalStockLocation {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location_type: string;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  linked_main_category_slug?: string | null;
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

/** @deprecated Legacy string-based location — use location_id FK instead */
export type StockLocation = 'store' | 'barista';

export interface LocalInventoryStockEntry {
  location_id: string;
  location_name?: string;
  quantity: number;
  min_quantity: number;
}

export interface LocalInventoryItem {
  id: string;
  name: string;
  unit: string;
  base_unit: string;
  pieces_per_unit: number;
  min_quantity: number;
  /** Normalized stock entries keyed by location — preferred shape */
  stock_by_location?: LocalInventoryStockEntry[];
  /** @deprecated legacy flat quantities — kept for offline fallback display only */
  store_quantity?: number;
  /** @deprecated legacy flat quantities — kept for offline fallback display only */
  barista_quantity?: number;
  notes?: string;
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalStockMovement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  /** @deprecated use location_id */
  location?: StockLocation;
  location_id?: string;
  order_id?: string;
  order_item_id?: string;
  quantity_delta: number;
  quantity_after?: number;
  transfer_id?: string;
  notes?: string;
  created_by?: string;
  synced?: 0 | 1;
  created_at?: string;
}

export interface LocalStockTransferItem {
  id: string;
  transfer_id: string;
  inventory_item_id: string;
  quantity: number;
  synced?: 0 | 1;
  created_at?: string;
}

export interface LocalStockTransfer {
  id: string;
  /** @deprecated use from_location_id */
  from_location?: StockLocation | string;
  /** @deprecated use to_location_id */
  to_location?: StockLocation | string;
  from_location_id?: string;
  to_location_id?: string;
  from_location_name?: string;
  to_location_name?: string;
  status: StockTransferStatus;
  notes?: string;
  created_by?: string;
  received_by?: string;
  received_at?: string;
  items?: LocalStockTransferItem[];
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalRecipe {
  id: string;
  menu_item_id: string;
  name: string;
  yield_quantity: number;
  deduct_from_location_id?: string | null;
  deduct_strategy: 'fixed_location' | 'by_menu_category' | 'default_location' | string;
  is_active?: boolean;
  ingredients?: LocalRecipeIngredient[];
  synced?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface LocalRecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number;
  waste_factor?: string;
  is_optional?: boolean;
  notes?: string | null;
  display_order?: number;
  name?: string; // Hydrated field
  unit?: string; // Hydrated field
  base_unit?: string; // Hydrated field
  synced?: 0 | 1;
}

