export type StockLocationType =
  | 'storage'
  | 'prep_station'
  | 'retail'
  | 'cold_storage';

export interface StockLocation {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location_type: StockLocationType | string;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  linked_main_category_slug?: string | null;
}

export interface StockLocationFormData {
  name: string;
  slug: string;
  description: string;
  location_type: StockLocationType;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  linked_main_category_slug: string;
}

export const DEFAULT_STOCK_LOCATION_FORM: StockLocationFormData = {
  name: '',
  slug: '',
  description: '',
  location_type: 'storage',
  is_default: false,
  is_active: true,
  display_order: 0,
  linked_main_category_slug: '',
};

export const LOCATION_TYPE_OPTIONS: Array<{ value: StockLocationType; label: string }> = [
  { value: 'storage', label: 'Storage' },
  { value: 'prep_station', label: 'Prep Station' },
  { value: 'retail', label: 'Retail' },
  { value: 'cold_storage', label: 'Cold Storage' },
];

export const nameToSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
