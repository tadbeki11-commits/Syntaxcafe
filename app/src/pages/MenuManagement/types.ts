export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  category: string;
  main_category?: string | null;
  categories?: Array<{
    id?: string;
    name: string;
    slug: string;
    type: string;
    icon?: string;
    display_order?: number;
    is_active?: boolean;
  }>;
  sub_category?: string | null;
  is_available: boolean;
  image_url?: string | null;
  prep_time_minutes?: number;
  sku?: string;
  barcode?: string;
  predefined_notes?: string[];
}

export interface MenuFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  main_category: string;
  tags: string;
  sub_category: string;
  is_available: boolean;
  image_base64: string;
  prep_time_minutes: string;
  sku: string;
  barcode: string;
  predefined_notes: string[];
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  unsyncedCount: number;
}
