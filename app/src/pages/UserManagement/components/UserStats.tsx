import React from 'react';
import { User, Shield } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';
import { UserItem } from '../types';

interface UserStatsProps {
  users: UserItem[];
}

export const UserStats: React.FC<UserStatsProps> = ({ users }) => {
  const total = users.length;
  const active = users.filter(u => u.is_active).length;
  const admins = users.filter(u => u.role === 'admin').length;
  const staff = users.filter(u => ['cafe_waiter', 'cashier', 'kitchen_staff'].includes(u.role)).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatsCard title="Total Users" value={total} icon={<User className="h-5 w-5" />} />
      <StatsCard title="Active" value={active} icon={<User className="h-5 w-5" />} variant="success" />
      <StatsCard title="Admins" value={admins} icon={<Shield className="h-5 w-5" />} variant="default" />
      <StatsCard title="Staff" value={staff} icon={<User className="h-5 w-5" />} variant="info" />
    </div>
  );
};

export default UserStats;
