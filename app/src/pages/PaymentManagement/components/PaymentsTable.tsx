import { uuidToDisplayId } from "@/lib/utils";
import React from 'react';
import { CreditCard, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { PaymentRecord } from '../types';
import { STATUS_VARIANT } from '../constants';

interface PaymentsTableProps {
  loading: boolean;
  filteredPayments: PaymentRecord[];
  openView: (payment: PaymentRecord) => void;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  loading,
  filteredPayments,
  openView
}) => {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">#{uuidToDisplayId(p.id)}</TableCell>
                    <TableCell className="text-muted-foreground">#{p.order_id}</TableCell>
                    <TableCell className="text-right font-bold">
                      {parseFloat(String(p.amount || 0)).toLocaleString()} Birr
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {p.payment_method ? (
                        <Badge variant="info" className="text-[10px]">
                          {p.payment_method.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status] || 'secondary'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openView(p)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={<CreditCard />}
                      title="No payments found"
                      description="Try adjusting filters"
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

export default PaymentsTable;
