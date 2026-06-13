import { useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatBirr } from '../utils';
import { Payment, Transaction } from '../types';

interface PaymentListTabProps {
  orgs: any[];
  selectedOrgId: string;
  setSelectedOrgId: (val: string) => void;
  payments: Payment[];
  transactions: Transaction[];
  loading: boolean;
}

export const PaymentListTab = ({
  orgs,
  selectedOrgId,
  setSelectedOrgId,
  payments,
  transactions,
  loading,
}: PaymentListTabProps) => {
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const getLinkedTransactions = (paymentId: number) => {
    return transactions.filter(t => t.payment_id === paymentId);
  };

  const getPaymentRemaining = (payment: Payment) => {
    const linkedTxns = getLinkedTransactions(payment.id);
    const deducted = linkedTxns.reduce((sum, t) => sum + Number(t.total_amount), 0);
    return Number(payment.amount) - deducted;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" />Payment List</CardTitle>
        <CardDescription>View all payments and their linked transactions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Organization *</Label>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
            <SelectContent>
              {orgs.filter(o => o.is_active !== false && o.is_active !== 0).map(o => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrgId && (
          <>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payments found for this organization.</div>
            ) : (
              <div className="space-y-3">
                {payments.map(payment => {
                  const linkedTxns = getLinkedTransactions(payment.id);
                  const remaining = getPaymentRemaining(payment);
                  const isExpanded = expandedPaymentId === String(payment.id);
                  
                  return (
                    <Collapsible key={payment.id} open={isExpanded} onOpenChange={() => setExpandedPaymentId(isExpanded ? null : String(payment.id))}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-left rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatBirr(payment.amount)}</p>
                                <Badge variant={remaining > 0 ? "default" : "secondary"} className="text-xs">
                                  {remaining > 0 ? `${formatBirr(remaining)} remaining` : 'Fully used'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(payment.payment_date).toLocaleDateString()}
                                {payment.notes && ` · ${payment.notes}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {linkedTxns.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {linkedTxns.length} txn{linkedTxns.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </span>
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="border border-t-0 rounded-b-lg bg-muted/30 px-4 py-3 space-y-2">
                        {linkedTxns.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No transactions linked to this payment.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Services</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {linkedTxns.map(txn => (
                                <TableRow key={txn.id}>
                                  <TableCell className="text-xs py-2">
                                    {new Date(txn.transaction_date).toLocaleDateString()}
                                    {txn.notes && <span className="text-muted-foreground ml-2">· {txn.notes}</span>}
                                  </TableCell>
                                  <TableCell className="text-xs py-2">
                                    {Array.isArray(txn.services) && txn.services.map((s, i) => (
                                      <div key={i} className="text-muted-foreground">
                                        {s.description}
                                      </div>
                                    ))}
                                  </TableCell>
                                  <TableCell className="text-xs py-2 text-right font-semibold text-rose-600 dark:text-rose-400">
                                    -{formatBirr(txn.total_amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
