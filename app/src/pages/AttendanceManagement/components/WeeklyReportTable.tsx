import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import EmptyState from '@/components/common/EmptyState';
import { WeeklyReportRecord } from '../types';

interface WeeklyReportTableProps {
  loading: boolean;
  weeklyReport: WeeklyReportRecord[];
}

export const WeeklyReportTable: React.FC<WeeklyReportTableProps> = ({
  loading,
  weeklyReport
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Summary Reports</CardTitle>
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
                <TableHead>Days Worked</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead className="hidden md:table-cell">Avg/Day</TableHead>
                <TableHead className="hidden md:table-cell">Week Start</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyReport.length > 0 ? (
                weeklyReport.map(report => (
                  <TableRow key={`${report.user_id}-${report.week_start}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                            {(report.full_name || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{report.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{report.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {(report.role || '').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{report.days_worked || 0}</TableCell>
                    <TableCell className="font-bold">{parseFloat(String(report.total_hours || 0)).toFixed(1)}h</TableCell>
                    <TableCell className="hidden md:table-cell text-success font-bold">
                      {report.days_worked > 0
                        ? (parseFloat(String(report.total_hours || 0)) / report.days_worked).toFixed(1)
                        : 0}h
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {report.week_start ? new Date(report.week_start).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<BarChart3 />}
                      title="No weekly data"
                      description="No weekly report metrics found."
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

export default WeeklyReportTable;
