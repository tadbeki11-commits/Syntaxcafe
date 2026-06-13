import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, INITIAL_FORM } from './constants';
import { ExpenseFormData } from './types';

export const formatCurrency = (value: any) => {
  const amount = Number.parseFloat(value || 0);
  if (!Number.isFinite(amount)) return '0 Birr';
  return `${parseInt(String(amount), 10).toLocaleString()} Birr`;
};

export const formatDateTime = (value: any) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export const getDefaultFormState = (
  categories: string[] = DEFAULT_CATEGORIES,
  paymentMethods: string[] = DEFAULT_PAYMENT_METHODS
): ExpenseFormData => ({
  ...INITIAL_FORM,
  category: categories[0] || INITIAL_FORM.category,
  payment_method: paymentMethods[0] || INITIAL_FORM.payment_method
});

export const mapExpenseToFormData = (
  expense: any,
  categories: string[] = DEFAULT_CATEGORIES,
  paymentMethods: string[] = DEFAULT_PAYMENT_METHODS
): ExpenseFormData => ({
  title: String(expense?.title || '').trim(),
  category: String(expense?.category || categories[0] || INITIAL_FORM.category).trim(),
  amount: String(expense?.amount ?? expense?.total ?? ''),
  paid_to: String(expense?.paid_to || '').trim(),
  notes: String(expense?.notes || '').trim(),
  payment_method: String(expense?.payment_method || paymentMethods[0] || INITIAL_FORM.payment_method).trim()
});
