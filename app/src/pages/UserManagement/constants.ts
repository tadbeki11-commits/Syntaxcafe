import { UserFormData } from './types';

export const ROLE_DISPLAY: Record<string, string> = {
  admin: 'Administrator',
  cashier: 'Cashier',
};

export const ROLE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'> = {
  admin: 'default',
  cashier: 'success',
};

export const ROLE_AVATAR_BG: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  cashier: 'bg-success text-success-foreground',
};

export const DEFAULT_FORM: UserFormData = {
  full_name: '',
  username: '',
  password: '',
  pin: '',
  cancel_password: '',
  role: 'cashier',
  is_active: true,
};
