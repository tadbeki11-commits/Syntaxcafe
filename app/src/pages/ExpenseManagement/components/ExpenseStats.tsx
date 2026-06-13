import React from 'react';
import { DollarSign, Calendar, BarChart3, PieChart } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';
import { DashboardData } from '../types';
import { formatCurrency } from '../utils';

interface ExpenseStatsProps {
  dashboard: DashboardData;
  summary: any;
}

export const ExpenseStats: React.FC<ExpenseStatsProps> = ({ dashboard, summary }) => {
  const topCategory = dashboard?.cards?.top_category || summary?.top_category || null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatsCard
        title="Expenses Today"
        value={formatCurrency(dashboard?.cards?.today_total || summary?.today_total || 0)}
        icon={<DollarSign className="h-5 w-5" />}
        variant="destructive"
      />
      <StatsCard
        title="Expenses This Week"
        value={formatCurrency(dashboard?.cards?.week_total || summary?.week_total || 0)}
        icon={<Calendar className="h-5 w-5" />}
        variant="warning"
      />
      <StatsCard
        title="Expenses This Month"
        value={formatCurrency(dashboard?.cards?.month_total || summary?.month_total || 0)}
        icon={<BarChart3 className="h-5 w-5" />}
        variant="info"
      />
      <StatsCard
        title="Top Category"
        value={topCategory?.category || '—'}
        subtitle={topCategory ? formatCurrency(topCategory.total) : 'No category data'}
        icon={<PieChart className="h-5 w-5" />}
      />
    </div>
  );
};
export default ExpenseStats;
