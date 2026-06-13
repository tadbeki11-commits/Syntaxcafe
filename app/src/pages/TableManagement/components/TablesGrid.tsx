import React from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/common/EmptyState';
import { Table } from '../types';

interface TablesGridProps {
  loading: boolean;
  tables: Table[];
  onDelete: (table: Table) => void;
  onAddClick: () => void;
}

export const TablesGrid: React.FC<TablesGridProps> = ({
  loading,
  tables,
  onDelete,
  onAddClick,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">All Tables</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : tables.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.map(table => (
              <div
                key={table.id}
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-all',
                  table.status === 'occupied'
                    ? 'border-orange-400 bg-orange-50/40'
                    : 'border-success/50 bg-success/8'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-bold">T{table.number}</h4>
                    <p className="text-xs text-muted-foreground">{table.capacity} seats</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive disabled:opacity-30"
                    onClick={() => onDelete(table)}
                    disabled={table.status === 'occupied'}
                    title={table.status === 'occupied' ? 'Cannot delete occupied table' : 'Delete table'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Badge variant={table.status === 'occupied' ? 'warning' : 'success'} className="text-[10px]">
                  {table.status === 'occupied' ? 'Occupied' : 'Available'}
                </Badge>
                {table.status === 'occupied' && table.waiter_name && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{table.waiter_name}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users />}
            title="No tables found"
            description="Click 'Add Table' to create your first table"
            action={<Button onClick={onAddClick}><Plus className="h-4 w-4 mr-2" />Add Table</Button>}
          />
        )}
      </CardContent>
    </Card>
  );
};
export default TablesGrid;
