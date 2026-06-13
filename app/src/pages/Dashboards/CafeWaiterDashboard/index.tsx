import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Clipboard, CheckCircle, Coffee, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import StatsCard from '@/components/common/StatsCard';
import { useWaiterData } from './hooks/useWaiterData';
import { useWaiterStats } from './hooks/useWaiterStats';
import { HeaderBanner } from './components/HeaderBanner';
import { QuickActions } from './components/QuickActions';
import { RecentOrdersPanel } from './components/RecentOrdersPanel';
import { Button } from '@/components/ui/button';

const CafeWaiterDashboard = () => {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const [statsRange, setStatsRange] = useState('today');

  const { loading, dashboardData, attendanceStatus, handleClockIn, handleClockOut } = useWaiterData(user?.id);
  const { rangeOrders, stats } = useWaiterStats(dashboardData.myOrders, statsRange);

  const handleClockInClick = async () => {
    if (await handleClockIn()) {
      toast.success('Clocked in successfully!');
    } else {
      toast.error('Failed to clock in');
    }
  };

  const handleClockOutClick = async () => {
    if (await handleClockOut()) {
      toast.success('Clocked out successfully!');
    } else {
      toast.error('Failed to clock out');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Orders',
      value: stats.ordersCreated,
      icon: <Clipboard className="w-5 h-5" />,
      variant: 'info' as const
    },
    {
      title: 'Orders Served',
      value: stats.ordersServed,
      icon: <CheckCircle className="w-5 h-5" />,
      variant: 'success' as const
    },
    {
      title: 'Revenue',
      value: `${stats.totalRevenue.toLocaleString()} Birr`,
      icon: <Coffee className="w-5 h-5" />,
      variant: 'default' as const
    },
    {
      title: 'Pending Balance',
      value: `${(Number(stats.pendingBalance) || 0).toLocaleString()} Birr`,
      icon: <DollarSign className="w-5 h-5" />,
      variant: 'warning' as const
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <HeaderBanner
        userName={user?.full_name}
        attendanceStatus={attendanceStatus}
        onClockIn={handleClockInClick}
        onClockOut={handleClockOutClick}
        onLogout={handleLogout}
      />

      <QuickActions
        onNewOrder={() => navigate('/waiter/create-order')}
        onOrderHistory={() => navigate('/waiter/order-history')}
        onViewMenu={() => navigate('/waiter/create-order')}
        onMyProfile={() => navigate('/waiter/profile')}
      />

      <div className="flex justify-center">
        <div className="flex bg-muted/50 p-1 rounded-xl border">
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All' }
          ].map((opt) => (
            <Button
              key={opt.key}
              variant={statsRange === opt.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatsRange(opt.key)}
              className="h-8 text-xs font-bold px-3 sm:px-4"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <RecentOrdersPanel orders={rangeOrders} />
    </div>
  );
};

export default CafeWaiterDashboard;
