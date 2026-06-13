import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '@/application';
import { useAuth } from '@/context/AuthContext';
import { Expense, ExpenseFilters, ExpenseFormData, DashboardData, ReportsData } from '../types';
import { INITIAL_FILTERS, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../constants';
import { getDefaultFormState, mapExpenseToFormData } from '../utils';

export const useExpenseData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS);
  const [formData, setFormData] = useState<ExpenseFormData>(() => getDefaultFormState());
  const [filters, setFilters] = useState<ExpenseFilters>(INITIAL_FILTERS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [dashboard, setDashboard] = useState<DashboardData>({
    cards: null,
    recent_expenses: [],
    trends: { daily: [], monthly: [] }
  });
  const [reports, setReports] = useState<ReportsData>({
    totals: null,
    category_totals: [],
    top_expenses: [],
    expense_vs_sales: null
  });
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);

  const loadExpenseData = useCallback(async (activeFilters: ExpenseFilters, showFullLoader = false) => {
    try {
      if (showFullLoader) setLoading(true);
      else setRefreshing(true);

      const [metaRes, listRes, dashboardRes, reportsRes] = await Promise.all([
        api.expenses.getMeta(),
        api.expenses.getAll(activeFilters),
        api.expenses.getDashboard(activeFilters),
        api.expenses.getReports(activeFilters)
      ]);

      const metaData = (metaRes as any)?.data?.data || (metaRes as any)?.data || {};
      const listData = (listRes as any)?.data?.data || (listRes as any)?.data || {};
      const dashboardData = (dashboardRes as any)?.data?.data || (dashboardRes as any)?.data || {};
      const reportsData = (reportsRes as any)?.data?.data || (reportsRes as any)?.data || {};

      const nextCats = Array.isArray(metaData.categories) && metaData.categories.length > 0 ? metaData.categories : DEFAULT_CATEGORIES;
      const nextPayMethods = Array.isArray(metaData.payment_methods) && metaData.payment_methods.length > 0
        ? metaData.payment_methods
        : DEFAULT_PAYMENT_METHODS;

      setCategories(nextCats);
      setPaymentMethods(nextPayMethods);

      if (!editingExpenseId) {
        setFormData((prev) => ({
          ...prev,
          category: prev.category || nextCats[0] || DEFAULT_CATEGORIES[0],
          payment_method: prev.payment_method || nextPayMethods[0] || DEFAULT_PAYMENT_METHODS[0]
        }));
      }
      setExpenses(Array.isArray(listData.expenses) ? listData.expenses : []);
      setSummary(listData.summary || (listRes as any)?.data?.summary || null);
      setDashboard({
        cards: dashboardData.cards || (dashboardRes as any)?.data?.cards || null,
        recent_expenses: Array.isArray(dashboardData.recent_expenses)
          ? dashboardData.recent_expenses
          : (Array.isArray((dashboardRes as any)?.data?.recent_expenses) ? (dashboardRes as any).data.recent_expenses : []),
        trends: {
          daily: Array.isArray(dashboardData?.trends?.daily)
            ? dashboardData.trends.daily
            : (Array.isArray((dashboardRes as any)?.data?.trends?.daily) ? (dashboardRes as any).data.trends.daily : []),
          monthly: Array.isArray(dashboardData?.trends?.monthly)
            ? dashboardData.trends.monthly
            : (Array.isArray((dashboardRes as any)?.data?.trends?.monthly) ? (dashboardRes as any).data.trends.monthly : [])
        }
      });
      setReports({
        totals: reportsData.totals || (reportsRes as any)?.data?.totals || null,
        category_totals: Array.isArray(reportsData.category_totals)
          ? reportsData.category_totals
          : (Array.isArray((reportsRes as any)?.data?.category_totals) ? (reportsRes as any).data.category_totals : []),
        top_expenses: Array.isArray(reportsData.top_expenses)
          ? reportsData.top_expenses
          : (Array.isArray((reportsRes as any)?.data?.top_expenses) ? (reportsRes as any).data.top_expenses : []),
        expense_vs_sales: reportsData.expense_vs_sales || (reportsRes as any)?.data?.expense_vs_sales || null
      });
    } catch (error: any) {
      console.error('Failed to load expense data:', error);
      toast.error(error?.response?.data?.message || 'Failed to load expense data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [editingExpenseId]);

  useEffect(() => {
    loadExpenseData(INITIAL_FILTERS, true);
  }, [loadExpenseData]);

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetExpenseForm = useCallback(() => {
    setEditingExpenseId(null);
    setFormData(getDefaultFormState(categories, paymentMethods));
  }, [categories, paymentMethods]);

  const handleSubmitExpense = async (event: React.FormEvent) => {
    event.preventDefault();

    const amount = Number.parseFloat(formData.amount);
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!formData.paid_to.trim()) {
      toast.error('Paid to is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        amount,
        user_id: user?.id ? String(user.id) : null
      };

      if (editingExpenseId) {
        await api.expenses.update(editingExpenseId, payload);
        toast.success('Expense updated successfully');
      } else {
        await api.expenses.create(payload);
        toast.success('Expense saved successfully');
      }

      resetExpenseForm();
      await loadExpenseData(filters);
    } catch (error: any) {
      console.error('Save expense failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpenseId(expense?.id ?? null);
    setFormData(mapExpenseToFormData(expense, categories, paymentMethods));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExpense = async (expense: any) => {
    if (!expense?.id) return;
    if (!window.confirm(`Delete expense "${expense.title}"?`)) return;

    try {
      setDeletingExpenseId(expense.id);
      await api.expenses.delete(expense.id);
      toast.success('Expense deleted successfully');
      if (editingExpenseId === expense.id) {
        resetExpenseForm();
      }
      await loadExpenseData(filters);
    } catch (error: any) {
      console.error('Delete expense failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const applyFilters = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadExpenseData(filters);
  };

  const resetFilters = async () => {
    setFilters(INITIAL_FILTERS);
    await loadExpenseData(INITIAL_FILTERS);
  };

  const setFormCategory = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
  };

  const setFormPaymentMethod = (payment_method: string) => {
    setFormData((prev) => ({ ...prev, payment_method }));
  };

  const setFilterCategory = (category: string) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const setFilterPaymentMethod = (payment_method: string) => {
    setFilters((prev) => ({ ...prev, payment_method }));
  };

  const totalVisibleAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number.parseFloat(String(expense?.amount || expense?.total || 0)), 0),
    [expenses]
  );

  return {
    loading,
    refreshing,
    submitting,
    categories,
    paymentMethods,
    formData,
    filters,
    expenses,
    summary,
    dashboard,
    reports,
    editingExpenseId,
    deletingExpenseId,
    totalVisibleAmount,
    handleFormChange,
    handleFilterChange,
    setFormCategory,
    setFormPaymentMethod,
    setFilterCategory,
    setFilterPaymentMethod,
    resetExpenseForm,
    handleSubmitExpense,
    handleEditExpense,
    handleDeleteExpense,
    applyFilters,
    resetFilters,
    loadExpenseData
  };
};
export default useExpenseData;
