import { Plus, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreditBadge } from './CreditBadge';
import { formatBirr } from '../utils';
import { ServiceRow, Payment, Transaction } from '../types';

interface RecordTransactionTabProps {
  orgs: any[];
  txOrgId: string;
  setTxOrgId: (val: string) => void;
  txDate: string;
  setTxDate: (val: string) => void;
  txNotes: string;
  setTxNotes: (val: string) => void;
  txServices: ServiceRow[];
  txSubmitting: boolean;
  txOrgPayments: Payment[];
  txOrgTransactions: Transaction[];
  txCreditBalance: number | null;
  openPaymentDetail: string | null;
  setOpenPaymentDetail: (val: string | null) => void;
  addServiceRow: () => void;
  removeServiceRow: (i: number) => void;
  updateServiceRow: (i: number, field: keyof ServiceRow, val: string) => void;
  txTotal: number;
  onSubmit: () => void;
}

export const RecordTransactionTab = ({
  orgs,
  txOrgId,
  setTxOrgId,
  txDate,
  setTxDate,
  txNotes,
  setTxNotes,
  txServices,
  txSubmitting,
  txOrgPayments,
  txOrgTransactions,
  txCreditBalance,
  openPaymentDetail,
  setOpenPaymentDetail,
  addServiceRow,
  removeServiceRow,
  updateServiceRow,
  txTotal,
  onSubmit,
}: RecordTransactionTabProps) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
      {/* Left: Transaction form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-500" />Record Service Transaction</CardTitle>
          <CardDescription>Deduct services used from the organization's credit balance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organization *</Label>
            <Select value={txOrgId} onValueChange={setTxOrgId}>
              <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
              <SelectContent>
                {orgs.filter(o => o.is_active !== false && o.is_active !== 0).map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name} — <span className="text-muted-foreground">{formatBirr(Number(o.credit_balance ?? 0))}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {txOrgId && txCreditBalance !== null && (
            <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Available credit:</span>
              <CreditBadge balance={txCreditBalance} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Transaction Date</Label>
            <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
          </div>

          {/* Services list */}
          <div className="space-y-2">
            <Label>Services Used *</Label>
            <div className="space-y-2">
              {txServices.map((svc, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    className="flex-1"
                    placeholder="Service description..."
                    value={svc.description}
                    onChange={e => updateServiceRow(i, 'description', e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    className="w-28"
                    placeholder="Cost"
                    value={svc.cost}
                    onChange={e => updateServiceRow(i, 'cost', e.target.value)}
                  />
                  {txServices.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeServiceRow(i)} className="text-destructive px-2">✕</Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addServiceRow} className="mt-1">
              <Plus className="h-3 w-3 mr-1" />Add service
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} rows={2} placeholder="Any additional context..." />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total deduction</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{formatBirr(txTotal)}</span>
          </div>

          <Button className="w-full" onClick={onSubmit} disabled={txSubmitting || !txOrgId}>
            {txSubmitting ? 'Recording...' : 'Record Transaction'}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Payment detail dropdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment History</h3>
        {!txOrgId ? (
          <p className="text-sm text-muted-foreground italic">Select an organization to see payment history.</p>
        ) : txOrgPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No payments recorded yet.</p>
        ) : txOrgPayments.map(payment => {
          const linkedTxns = txOrgTransactions.filter(t => t.payment_id === payment.id);
          const isOpen = openPaymentDetail === String(payment.id);
          return (
            <Collapsible key={payment.id} open={isOpen} onOpenChange={() => setOpenPaymentDetail(isOpen ? null : String(payment.id))}>
              <CollapsibleTrigger asChild>
                <button className="w-full text-left rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatBirr(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString()}{payment.notes ? ` · ${payment.notes}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {linkedTxns.length > 0 && <Badge variant="secondary" className="text-xs">{linkedTxns.length} txn{linkedTxns.length > 1 ? 's' : ''}</Badge>}
                      <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border border-t-0 rounded-b-lg bg-muted/30 px-4 py-3 space-y-2">
                {linkedTxns.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No transactions linked to this payment.</p>
                ) : linkedTxns.map(txn => (
                  <div key={txn.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{new Date(txn.transaction_date).toLocaleDateString()}{txn.notes ? ` · ${txn.notes}` : ''}</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">−{formatBirr(txn.total_amount)}</span>
                    </div>
                    {Array.isArray(txn.services) && txn.services.map((s: any, si: number) => (
                      <div key={si} className="flex justify-between text-xs pl-2 border-l border-muted-foreground/20">
                        <span className="text-muted-foreground">{s.description}</span>
                        <span>{formatBirr(s.cost)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};
