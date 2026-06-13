import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface OrderStatsProps {
  orders: any[];
  paidOrderIdSet: Set<string>;
}

export const OrderStats: React.FC<OrderStatsProps> = ({ orders, paidOrderIdSet }) => {
  const stats = React.useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      const isPaid = paidOrderIdSet?.has(String(order.id)) || order.payment_status === 'paid';
      return isPaid ? sum + parseFloat(order.total_amount || 0) : sum;
    }, 0);
    
    const unpaidAmount = orders.reduce((sum, order) => {
      const isPaid = paidOrderIdSet?.has(String(order.id)) || order.payment_status === 'paid';
      return !isPaid ? sum + parseFloat(order.total_amount || 0) : sum;
    }, 0);

    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;

    return {
      totalOrders,
      totalRevenue,
      unpaidAmount,
      pendingOrders,
      completedOrders,
    };
  }, [orders, paidOrderIdSet]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = 'default' 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: string;
    color?: 'default' | 'success' | 'warning' | 'danger';
  }) => {
    const colorClasses = {
      default: 'bg-primary/10 text-primary',
      success: 'bg-emerald-50 text-emerald-600',
      warning: 'bg-amber-50 text-amber-600',
      danger: 'bg-rose-50 text-rose-600',
    };

    return (
      <Card className="border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {trend && (
                <p className="text-xs text-muted-foreground">{trend}</p>
              )}
            </div>
            <div className={`rounded-full p-3 ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Orders"
        value={stats.totalOrders}
        icon={ShoppingCart}
        color="default"
      />
      <StatCard
        title="Total Revenue"
        value={`${stats.totalRevenue.toLocaleString()} Birr`}
        icon={DollarSign}
        color="success"
      />
      <StatCard
        title="Pending Orders"
        value={stats.pendingOrders}
        icon={Clock}
        color="warning"
      />
      <StatCard
        title="Unpaid Amount"
        value={`${stats.unpaidAmount.toLocaleString()} Birr`}
        icon={AlertCircle}
        color="danger"
      />
    </div>
  );
};
