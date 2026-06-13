import React from 'react';
import { Download } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import useAttendanceData from './hooks/useAttendanceData';
import AttendanceStats from './components/AttendanceStats';
import TodayAttendanceTable from './components/TodayAttendanceTable';
import WeeklyReportTable from './components/WeeklyReportTable';

export const AttendanceManagement: React.FC = () => {
  const {
    loading,
    weeklyReport,
    todayAttendance,
    stats,
    exportCSV
  } = useAttendanceData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Attendance Management"
        description="Track employee clock-in and clock-out statistics"
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      <AttendanceStats stats={stats} />

      <TodayAttendanceTable
        loading={loading}
        todayAttendance={todayAttendance}
      />

      <WeeklyReportTable
        loading={loading}
        weeklyReport={weeklyReport}
      />
    </div>
  );
};

export default AttendanceManagement;
