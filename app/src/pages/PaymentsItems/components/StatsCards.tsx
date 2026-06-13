import React from 'react';
import { Coffee, TrendingUp } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';
import { ItemSalesCounts } from '../types';

interface StatsCardsProps {
  counts: ItemSalesCounts;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ counts }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatsCard
        title="Total Food Items Sold"
        value={counts.foodQty}
        subtitle="Cafe & Restaurant aggregations"
        icon={<Coffee className="w-5 h-5" />}
        variant="success"
      />
      <StatsCard
        title="Total Beverages Sold"
        value={counts.softQty}
        subtitle="Barista beverage orders count"
        icon={<TrendingUp className="w-5 h-5" />}
        variant="info"
      />
    </div>
  );
};

export default StatsCards;
