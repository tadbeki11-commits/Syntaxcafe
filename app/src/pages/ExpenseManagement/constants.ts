import { ExpenseFormData, ExpenseFilters } from './types';

export const DEFAULT_CATEGORIES = [
  'Food & Ingredients',
  'Beverages',
  'Employee Salaries',
  'Utilities',
  'Rent',
  'Maintenance',
  'Cleaning & Supplies',
  'Equipment Purchase',
  'Marketing',
  'Other'
];

export const DEFAULT_PAYMENT_METHODS = ['Cash', 'Bank', 'Mobile Money'];

export const INITIAL_FORM: ExpenseFormData = {
  title: '',
  category: 'Food & Ingredients',
  amount: '',
  paid_to: '',
  notes: '',
  payment_method: 'Cash'
};

export const INITIAL_FILTERS: ExpenseFilters = {
  search: '',
  category: '',
  payment_method: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: ''
};
