import React from 'react';
import { BarChart2, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';
import { ReportData } from '../types';

interface ReportsStatsProps {
  reportData: ReportData;
}

export const ReportsStats: React.FC<ReportsStatsProps> = ({ reportData }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Today's Orders"
        value={reportData.dailyStats.totalOrders}
        subtitle={`Cafe: ${reportData.dailyStats.cafeOrders} | Rest: ${reportData.dailyStats.restaurantOrders} | Bar: ${reportData.dailyStats.baristaOrders}`}
        icon={<BarChart2 className="w-5 h-5" />}
        variant="info"
      />
      <StatsCard
        title="Today's Revenue"
        value={`${(reportData.dailyStats.paidRevenue || 0).toLocaleString()} Birr`}
        subtitle="Paid settlement orders only"
        icon={<DollarSign className="w-5 h-5" />}
        variant="success"
      />
      <StatsCard
        title="Weekly Orders"
        value={reportData.weeklyStats.totalOrders}
        subtitle={`Avg paid: ${(reportData.weeklyStats.avgPaidOrderValue || 0).toLocaleString()} Birr`}
        icon={<TrendingUp className="w-5 h-5" />}
        variant="default"
      />
      <StatsCard
        title="Monthly Growth"
        value={`${(reportData.monthlyStats.growth || 0) >= 0 ? '+' : ''}${(reportData.monthlyStats.growth || 0).toFixed(1)}%`}
        subtitle={`${(reportData.monthlyStats.paidRevenue || 0).toLocaleString()} Birr this month`}
        icon={<Calendar className="w-5 h-5" />}
        variant="warning"
      />
    </div>
  );
};

export default ReportsStats;
