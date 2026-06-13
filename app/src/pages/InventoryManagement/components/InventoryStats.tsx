import React from 'react';
import { Package, AlertTriangle, Coffee } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';

interface InventoryStatsProps {
  totalItems: number;
  lowStockCount: number;
  baristaItemsCount: number;
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({
  totalItems,
  lowStockCount,
  baristaItemsCount
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatsCard title="Total Items" value={totalItems} icon={<Package className="h-5 w-5" />} />
      <StatsCard
        title="Low Stock Alerts"
        value={lowStockCount}
        icon={<AlertTriangle className="h-5 w-5" />}
        variant={lowStockCount > 0 ? 'destructive' : 'success'}
      />
      <StatsCard
        title="At Barista"
        value={baristaItemsCount}
        icon={<Coffee className="h-5 w-5" />}
        variant="info"
      />
    </div>
  );
};

export default InventoryStats;
