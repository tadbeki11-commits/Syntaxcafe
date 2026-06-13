import React from 'react';
import { Users, CheckCircle, AlertCircle } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';

interface TableStatsProps {
  total: number;
  available: number;
}

export const TableStats: React.FC<TableStatsProps> = ({ total, available}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <StatsCard
        title="Total Tables"
        value={total}
      />
      <StatsCard
        title="Available"
        value={available}
        icon={<CheckCircle className="h-5 w-5" />}
        variant="success"
      />

    </div>
  );
};
export default TableStats;
