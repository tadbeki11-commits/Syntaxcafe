import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCardData } from '../types';

interface StatsCardsGridProps {
  cards: StatsCardData[];
}

export const StatsCardsGrid: React.FC<StatsCardsGridProps> = ({ cards }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {card.title}
              </p>
              <p className="text-xl font-extrabold text-foreground">{card.value}</p>
            </div>
            <div className="p-3 bg-muted rounded-2xl text-primary">
              {card.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
