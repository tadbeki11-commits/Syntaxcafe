import React from 'react';
import PageHeader from '@/components/layout/PageHeader';
import useEmployeeData from './hooks/useEmployeeData';
import EmployeeFilters from './components/EmployeeFilters';
import EmployeeStats from './components/EmployeeStats';
import EmployeesTable from './components/EmployeesTable';
import EmployeeDetails from './components/EmployeeDetails';

export const EmployeeManagement: React.FC = () => {
  const {
    loading,
    selectedEmployeeId,
    setSelectedEmployeeId,
    employees,
    details,
    activeSummary
  } = useEmployeeData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Employee Management"
        description="Live server orders created by employees"
      />

      <EmployeeFilters
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
        employees={employees}
      />

      <EmployeeStats activeSummary={activeSummary} />

      <EmployeesTable
        loading={loading}
        employees={employees}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
      />

      {selectedEmployeeId && selectedEmployeeId !== 'all' && (
        <EmployeeDetails details={details} />
      )}
    </div>
  );
};

export default EmployeeManagement;
