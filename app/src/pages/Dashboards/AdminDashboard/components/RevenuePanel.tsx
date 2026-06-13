import { uuidToDisplayId } from "@/lib/utils";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '../utils';

interface RevenuePanelProps {
  payments: any[];
  getPaymentAmount: (payment: any) => number;
}

export const RevenuePanel: React.FC<RevenuePanelProps> = ({
  payments,
  getPaymentAmount
}) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Revenue & Settlement Ledger</CardTitle>
          <CardDescription>
            Payout timeline logs across all gateway accounts
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/dashboard/payments')}
        >
          Full Audit
        </Button>
      </CardHeader>
      <CardContent className="pt-6 overflow-x-auto">
        <div className="min-w-[600px] space-y-2">
          <div className="grid grid-cols-5 text-[10px] uppercase font-bold text-muted-foreground pb-2 border-b">
            <div>Ref ID</div>
            <div>Order #</div>
            <div>Settled amount</div>
            <div>Gateway Channel</div>
            <div className="text-right">Settlement Timeline</div>
          </div>

          {payments.length > 0 ? (
            payments.map((payment: any) => (
              <div
                key={payment.id}
                className="grid grid-cols-5 text-xs font-bold text-foreground py-3.5 border-b hover:bg-muted/10 transition-colors rounded-xl px-1 items-center"
              >
                <div className="text-muted-foreground font-extrabold">
                  P-{uuidToDisplayId(payment.id)}
                </div>
                <div className="text-foreground">#{payment.order_id}</div>
                <div>
                  <span className="font-extrabold text-success bg-success/10 dark:bg-green-950/20 px-2 py-0.5 rounded-md border border-success/30">
                    {formatCurrency(getPaymentAmount(payment))}
                  </span>
                </div>
                <div>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase py-0">
                    {payment.payment_method?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <Badge variant="success" className="text-[8px] uppercase py-0">
                    {payment.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {formatDate(payment.created_at)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
              No recent transactions settled in this range
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
