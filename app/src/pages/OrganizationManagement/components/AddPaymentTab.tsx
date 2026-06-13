import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatBirr } from '../utils';

interface AddPaymentTabProps {
  orgs: any[];
  payOrgId: string;
  setPayOrgId: (val: string) => void;
  payAmount: string;
  setPayAmount: (val: string) => void;
  payDate: string;
  setPayDate: (val: string) => void;
  payNotes: string;
  setPayNotes: (val: string) => void;
  paySubmitting: boolean;
  onSubmit: () => void;
}

export const AddPaymentTab = ({
  orgs,
  payOrgId,
  setPayOrgId,
  payAmount,
  setPayAmount,
  payDate,
  setPayDate,
  payNotes,
  setPayNotes,
  paySubmitting,
  onSubmit,
}: AddPaymentTabProps) => {
  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" />Add Credit Payment</CardTitle>
          <CardDescription>Top up an organization's credit balance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organization *</Label>
            <Select value={payOrgId} onValueChange={setPayOrgId}>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (Birr) *</Label>
              <Input type="number" min={0} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2} placeholder="Bank transfer ref, etc." />
          </div>
          <Button className="w-full" onClick={onSubmit} disabled={paySubmitting}>
            {paySubmitting ? 'Adding...' : 'Add Payment'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
