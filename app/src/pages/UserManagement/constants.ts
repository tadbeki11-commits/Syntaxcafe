import { UserFormData } from './types';

export const ROLE_DISPLAY: Record<string, string> = {
  admin: 'Administrator',
  cafe_waiter: 'Café Waiter',
  cashier: 'Cashier',
  kitchen_staff: 'Kitchen Staff',
};

export const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'> = {
  admin: 'default',
  cafe_waiter: 'info',
  cashier: 'success',
  kitchen_staff: 'warning',
};

export const ROLE_AVATAR_BG: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  cafe_waiter: 'bg-info text-info-foreground',
  cashier: 'bg-success text-success-foreground',
  kitchen_staff: 'bg-destructive text-destructive-foreground',
};

export const DEFAULT_FORM: UserFormData = {
  full_name: '',
  username: '',
  password: '',
  pin: '',
  cancel_password: '',
  role: 'cafe_waiter',
  is_active: true,
};
