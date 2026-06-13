import React from 'react';
import { User, Clock, BarChart3, Calendar } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';
import { AttendanceStats as StatsType } from '../types';

interface AttendanceStatsProps {
  stats: StatsType;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatsCard
        title="Present Today"
        value={stats.todayPresent}
        icon={<User className="h-5 w-5" />}
        variant="info"
      />
      <StatsCard
        title="Currently Active"
        value={stats.activeEmployees}
        icon={<Clock className="h-5 w-5" />}
        variant="success"
      />
      <StatsCard
        title="Total Hours Today"
        value={`${stats.totalHoursToday}h`}
        icon={<BarChart3 className="h-5 w-5" />}
        variant="warning"
      />
      <StatsCard
        title="Avg Hours/Employee"
        value={`${stats.avgHours}h`}
        icon={<Calendar className="h-5 w-5" />}
      />
    </div>
  );
};

export default AttendanceStats;
