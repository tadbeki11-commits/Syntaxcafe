import { uuidToDisplayId } from "@/lib/utils";
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { OrderDetailsDialog } from '@/components/common/OrderDetailsDialog';
import { EmployeeDetailsData } from '../types';
import { formatAmount } from '../utils';

interface EmployeeDetailsProps {
  details: EmployeeDetailsData | null;
}

export const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ details }) => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Table</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(details?.orders || []).length > 0 ? details?.orders?.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-bold">#{uuidToDisplayId(o.id)}</TableCell>
                  <TableCell>{o.employee_name || `Employee #${o.employee_id}`}</TableCell>
                  <TableCell className="capitalize">{o.type}</TableCell>
                  <TableCell>{o.table_number ?? 'N/A'}</TableCell>
                  <TableCell className="text-right font-medium">{formatAmount(o.total_amount)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        o.status === 'paid' ? 'success' : o.status === 'pending' ? 'warning' : 'secondary'
                      }
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={String(o.payment_status || '').toLowerCase() === 'paid' ? 'success' : 'secondary'}>
                      {o.payment_status || 'unpaid'}
                    </Badge>
                  </TableCell>
                  <TableCell>{o.created_at ? new Date(o.created_at).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(o)} className="h-8 w-8 hover:bg-accent hover:text-accent-foreground">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState title="No orders" description="No orders for this employee" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OrderDetailsDialog 
        order={selectedOrder} 
        open={!!selectedOrder} 
        onOpenChange={(open) => !open && setSelectedOrder(null)} 
      />
    </div>
  );
};

export default EmployeeDetails;
