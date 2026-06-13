import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import EmptyState from '@/components/common/EmptyState';
import { AttendanceRecord } from '../types';
import { getApproximateServerDate } from '@/shared/utils/serverTime';

interface TodayAttendanceTableProps {
  loading: boolean;
  todayAttendance: AttendanceRecord[];
}

export const TodayAttendanceTable: React.FC<TodayAttendanceTableProps> = ({
  loading,
  todayAttendance
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Today's Attendance</CardTitle>
        <span className="text-xs text-muted-foreground">{getApproximateServerDate().toLocaleDateString()}</span>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead className="hidden md:table-cell">Clock Out</TableHead>
                <TableHead className="hidden md:table-cell">Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayAttendance.length > 0 ? (
                todayAttendance.map(record => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-info/15 text-info text-xs font-bold">
                            {(record.full_name || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{record.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{record.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {(record.role || '').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.clock_in_time
                        ? new Date(record.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {record.clock_out_time
                        ? new Date(record.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-medium text-sm">
                      {record.hours_worked ? `${parseFloat(String(record.hours_worked)).toFixed(1)}h` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={!record.clock_out_time ? 'success' : 'info'}>
                        {!record.clock_out_time ? 'Active' : 'Completed'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Clock />}
                      title="No attendance today"
                      description="No clock-in records logged for today yet."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayAttendanceTable;
