import React from 'react';
import { Clipboard, CheckCircle, Coffee, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Stats {
  ordersCreated: number;
  ordersServed: number;
  totalRevenue: number;
  pendingBalance: number;
}

interface EmployeeStatsGridProps {
  stats: Stats;
  formatCurrency: (val: any) => string;
}

export const EmployeeStatsGrid: React.FC<EmployeeStatsGridProps> = ({
  stats,
  formatCurrency
}) => {
  const cards = [
    {
      title: 'Created Checkouts',
      value: stats.ordersCreated,
      icon: Clipboard,
    },
    {
      title: 'Settled Checkouts',
      value: stats.ordersServed,
      icon: CheckCircle,
    },
    {
      title: 'Gross Cash Settled',
      value: formatCurrency(stats.totalRevenue),
      icon: Coffee,
    },
    {
      title: 'Active Pending Debit',
      value: formatCurrency(stats.pendingBalance),
      icon: DollarSign,
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="transition-colors hover:bg-muted/40">
            <CardContent className="flex items-center justify-between p-5">
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  {card.value}
                </p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
