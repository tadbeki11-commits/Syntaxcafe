import React from 'react';
import StatsCard from '@/components/common/StatsCard';
import { Clipboard, CheckCircle, Clock } from 'lucide-react';

interface StatsCardsGridProps {
  todayStats: any;
}

export const StatsCardsGrid: React.FC<StatsCardsGridProps> = ({ todayStats }) => {
  const statsCards = [
    {
      title: "Today's Orders Received",
      value: todayStats.ordersReceived,
      icon: <Clipboard className="w-5 h-5" />,
      variant: 'info' as const
    },
    {
      title: 'Cookings Finished',
      value: todayStats.ordersCompleted,
      icon: <CheckCircle className="w-5 h-5" />,
      variant: 'success' as const
    },
    {
      title: 'Average Cook Time',
      value: `${todayStats.averageTime} min`,
      icon: <Clock className="w-5 h-5" />,
      variant: 'warning' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsCards.map((card, index) => (
        <StatsCard
          key={index}
          title={card.title}
          value={card.value}
          icon={card.icon}
          variant={card.variant}
        />
      ))}
    </div>
  );
};
