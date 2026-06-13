import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { EmployeeSummary } from '../types';
import { formatAmount } from '../utils';

interface EmployeesTableProps {
  loading: boolean;
  employees: EmployeeSummary[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
}

export const EmployeesTable: React.FC<EmployeesTableProps> = ({
  loading,
  employees,
  selectedEmployeeId,
  setSelectedEmployeeId
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employees Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Orders Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Unpaid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length > 0 ? employees.map(e => (
                <TableRow
                  key={e.employee_id}
                  className="cursor-pointer"
                  onClick={() => setSelectedEmployeeId(String(e.employee_id))}
                  data-state={String(e.employee_id) === selectedEmployeeId ? 'selected' : undefined}
                >
                  <TableCell className="font-medium">{e.employee_name}</TableCell>
                  <TableCell className="text-right">{formatAmount(e.orders_total)}</TableCell>
                  <TableCell className="text-right text-success font-medium">{formatAmount(e.paid_total)}</TableCell>
                  <TableCell className="text-right text-destructive font-medium">{formatAmount(e.unpaid_total)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState
                      icon={<Users />}
                      title="No employees found"
                      description="No employee data is available."
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

export default EmployeesTable;
