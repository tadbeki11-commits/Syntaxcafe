import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Employee {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface EmployeeSelectViewProps {
  employees: Employee[];
  onSelectEmployee: (id: string) => void;
}

export const EmployeeSelectView: React.FC<EmployeeSelectViewProps> = ({
  employees,
  onSelectEmployee
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return employees;
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(term) ||
        e.username.toLowerCase().includes(term) ||
        e.role.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold text-foreground">
          Waiter Profiles
        </CardTitle>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredEmployees.map((e) => {
              const initials = e.full_name
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelectEmployee(String(e.id))}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {initials || '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-tight text-foreground">
                      {e.full_name}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          e.is_active ? 'bg-success' : 'bg-muted-foreground'
                        }`}
                      />
                      <span className="truncate text-[10px] capitalize text-muted-foreground">
                        {e.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No employees match your search criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
