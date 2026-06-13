import React from 'react';
import { CreditCard, DollarSign, Smartphone, Wifi } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentMethod } from '../types';

const ICON_MAP: Record<string, React.ElementType> = {
  'dollar-sign': DollarSign,
  'credit-card': CreditCard,
  'square': Wifi,
  'smartphone': Smartphone,
};

interface PaymentMethodStatsProps {
  methods: PaymentMethod[];
}

export const PaymentMethodStats: React.FC<PaymentMethodStatsProps> = ({ methods }) => {
  const activeCount = methods.filter(m => m.is_active).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Methods</div>
          <div className="text-2xl font-extrabold">{methods.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Active</div>
          <div className="text-2xl font-extrabold text-success">{activeCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Disabled</div>
          <div className="text-2xl font-extrabold text-muted-foreground">{methods.length - activeCount}</div>
        </CardContent>
      </Card>
    </div>
  );
};
