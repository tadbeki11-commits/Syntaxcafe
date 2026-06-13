import React from 'react';
import { Users, DollarSign, TrendingDown } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';
import { formatAmount } from '../utils';

interface EmployeeStatsProps {
  activeSummary: any;
}

export const EmployeeStats: React.FC<EmployeeStatsProps> = ({ activeSummary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatsCard
        title="Orders Total"
        value={`${formatAmount(activeSummary?.orders_total)} Birr`}
        subtitle={`${activeSummary?.orders_count ?? 0} orders`}
        icon={<Users className="h-5 w-5" />}
        variant="default"
      />
      <StatsCard
        title="Paid Total"
        value={`${formatAmount(activeSummary?.paid_total)} Birr`}
        subtitle={`${activeSummary?.payments_count ?? 0} payments`}
        icon={<DollarSign className="h-5 w-5" />}
        variant="success"
      />
      <StatsCard
        title="Unpaid Total"
        value={`${formatAmount(activeSummary?.unpaid_total)} Birr`}
        subtitle="Unpaid balance"
        icon={<TrendingDown className="h-5 w-5" />}
        variant="destructive"
      />
    </div>
  );
};

export default EmployeeStats;
