import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { useExpenseData } from './hooks/useExpenseData';
import { ExpenseStats } from './components/ExpenseStats';
import { ExpenseForm } from './components/ExpenseForm';
import { TrendChart } from './components/TrendChart';
import { RecentExpenses } from './components/RecentExpenses';
import { ExpenseFilters } from './components/ExpenseFilters';
import { ExpenseReports } from './components/ExpenseReports';
import { ExpenseTable } from './components/ExpenseTable';
import { formatCurrency } from './utils';

const ExpenseManagement = () => {
  const {
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
  } = useExpenseData();

  const isEditMode = editingExpenseId != null;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Expense Management"
        description="Track operating costs, review spending patterns, and compare expenses against sales"
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Visible Expenses</p>
              <p className="text-sm font-extrabold text-primary">{formatCurrency(totalVisibleAmount)}</p>
            </div>
            <Button variant="outline" onClick={() => loadExpenseData(filters)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <ExpenseStats dashboard={dashboard} summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <ExpenseForm
          isEditMode={isEditMode}
          formData={formData}
          categories={categories}
          paymentMethods={paymentMethods}
          submitting={submitting}
          onFormChange={handleFormChange}
          onCategoryChange={setFormCategory}
          onPaymentMethodChange={setFormPaymentMethod}
          onSubmit={handleSubmitExpense}
          onCancel={resetExpenseForm}
        />

        {/* Trends & Recents */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TrendChart title="Daily Expense Trend" data={dashboard?.trends?.daily} colorClass="bg-destructive/80" />
            <TrendChart title="Monthly Expense Trend" data={dashboard?.trends?.monthly} colorClass="bg-info/80" />
          </div>

          <RecentExpenses recentExpenses={dashboard?.recent_expenses} />
        </div>
      </div>

      {/* Filters Card */}
      <ExpenseFilters
        filters={filters}
        categories={categories}
        paymentMethods={paymentMethods}
        onFilterChange={handleFilterChange}
        onCategoryChange={setFilterCategory}
        onPaymentMethodChange={setFilterPaymentMethod}
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
      />

      {/* Grid of Reports & Comparison */}
      <ExpenseReports reports={reports} />

      {/* Ledger Table */}
      <ExpenseTable
        expenses={expenses}
        deletingExpenseId={deletingExpenseId}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />
    </div>
  );
};

export default ExpenseManagement;
