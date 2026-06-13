/**
 * PaymentMethodTypes
 */
export interface PaymentMethod {
  id: number;
  name: string;
  display_name: string;
  icon?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodFormData {
  name: string;
  display_name: string;
  icon: string;
  description: string;
  is_active: boolean;
}

export const DEFAULT_PAYMENT_METHOD_FORM: PaymentMethodFormData = {
  name: '',
  display_name: '',
  icon: '',
  description: '',
  is_active: true,
};
