import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeSummary } from '../types';

interface EmployeeFiltersProps {
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  employees: EmployeeSummary[];
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  selectedEmployeeId,
  setSelectedEmployeeId,
  employees
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filter by Employee</CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => (
              <SelectItem key={e.employee_id} value={String(e.employee_id)}>
                {e.employee_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default EmployeeFilters;
